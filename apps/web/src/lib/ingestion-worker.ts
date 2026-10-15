import { assertApprovedFetchUrl, canonicalizeClaimUrl, classifyFetchResponse, extractCandidateFromFeedItem, extractCandidateWithDeadline, extractDeadlineFromText, htmlToText, isRobotsAllowed, parseJsonFeed, parseOfficialPage, parseRobotsTxt, parseSyndicationFeed, cosineSimilarity, textFeatureEmbedding, validateCandidate } from '@lo-lyfe/core';
import type { Candidate, FeedItem } from '@lo-lyfe/core';
import type { SupabaseClient } from '@supabase/supabase-js';

type Row={id:string;name:string;source_type:string;base_url:string;crawl_interval_minutes:number;allowed_hosts:string[];etag:string|null;consecutive_failures:number};
const UA='lo-lyfe-bot/1.0 (+https://github.com/jcltd303-hub/lo-lyfe)';
/** Article fetches per source per run: bounds added latency and outbound traffic. */
const MAX_ARTICLE_FETCHES_PER_SOURCE=10;
/**
 * Evergreen sentinel for directory pages (e.g. USA.gov unclaimed money):
 * these opportunities have no claim deadline by nature. Matches the seed
 * catalog's convention (all seeded unclaimed-property rows use 2031-12-31),
 * so the expire cron and the public deadline filter treat them identically.
 */
const EVERGREEN_DEADLINE='2031-12-31';

/**
 * Stage 2: the feed snippet failed stage 1 (no deadline, or no category
 * keyword in the snippet). Fetch the article and take a deadline-LABELED
 * date from it (Claim Form Deadline, file-by, comment-due). Bare dates are
 * never accepted here, so a publication or hearing date cannot become a
 * fake claim deadline. Category may come from the snippet or the head of
 * the article. Any failure skips the item only, never the source.
 */
async function tryArticleDeadline(admin:SupabaseClient,source:Row,item:FeedItem,budget:{used:number}):Promise<Candidate|null>{
  if(budget.used>=MAX_ARTICLE_FETCHES_PER_SOURCE)return null;
  const title=item.title?.trim(),body=item.description?.trim(),rawUrl=item.link?.trim();
  if(!title||!body||!rawUrl)return null;
  // No snippet-deadline or snippet-category gate here: stage 2 also rescues
  // items whose snippet has a date but no category keyword, since category
  // may come from the article head. The fetch budget still bounds volume.
  let articleUrl:URL;
  try{
    articleUrl=new URL(rawUrl);
    if(articleUrl.protocol!=='https:')return null;
    const host=articleUrl.hostname.toLowerCase();
    if(!source.allowed_hosts.some(h=>host===h.toLowerCase()))return null; // never fetch an unapproved host; validateCandidate enforces this too
  }catch{return null}
  // Skip articles already in the catalog before spending a fetch on them.
  try{
    const canonical=canonicalizeClaimUrl(articleUrl.href);
    const dup=await admin.from('opportunities').select('id').eq('canonical_url',canonical).in('status',['review','published']).limit(1);
    if((dup.data??[]).length>0)return null;
  }catch{/* fall through: the article fetch still decides */}
  budget.used++;
  try{
    const robotsUrl=new URL('/robots.txt',articleUrl).href;
    const rr=await fetch(robotsUrl,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(10000)});
    if(rr.ok){const rules=parseRobotsTxt((await rr.text()).slice(0,500001));if(!isRobotsAllowed(articleUrl.href,rules))return null}
    const res=await fetch(articleUrl,{headers:{'User-Agent':UA,'Accept':'text/html;q=0.8'},redirect:'follow',signal:AbortSignal.timeout(10000)});
    if(res.status<200||res.status>=300)return null;
    // Redirects are allowed for articles (www/trailing-slash hops are common),
    // but the final landing host must still be an approved one.
    try{const finalHost=new URL(res.url).hostname.toLowerCase();if(!source.allowed_hosts.some(h=>finalHost===h.toLowerCase()))return null}catch{return null}
    const articleText=htmlToText((await res.text()).slice(0,500001));
    const deadline=extractDeadlineFromText(articleText,{labeledOnly:true});
    if(!deadline)return null;
    // Category from snippet + article head (own intro, not sidebar boilerplate).
    return extractCandidateWithDeadline(item,deadline,`${title} ${body} ${articleText.slice(0,3000)}`);
  }catch{return null}
}

export async function ingestSource(admin:SupabaseClient,source:Row){
 const started=new Date().toISOString();const run=await admin.from('ingestion_runs').insert({source_id:source.id,started_at:started}).select('id').single();if(run.error)throw run.error;
 try{
  const crawl={...source,baseUrl:source.base_url,crawlIntervalMinutes:source.crawl_interval_minutes,allowedHosts:source.allowed_hosts,active:true};
  const target=assertApprovedFetchUrl(source.base_url,crawl);const robotsUrl=new URL('/robots.txt',target).href;
  const rr=await fetch(robotsUrl,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(10000)});if(rr.ok){const rules=parseRobotsTxt((await rr.text()).slice(0,500001));if(!isRobotsAllowed(target.href,rules))throw new Error('ROBOTS_DENIED')}
  const headers:Record<string,string>={'User-Agent':UA,'Accept':'application/json, application/feed+json, application/rss+xml, application/atom+xml, text/html;q=0.8'};if(source.etag)headers['If-None-Match']=source.etag;
  const res=await fetch(target,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});const decision=classifyFetchResponse(res.status,{etag:res.headers.get('etag')??undefined,'retry-after':res.headers.get('retry-after')??undefined},new Date(),source.consecutive_failures);
  if(decision.action!=='ingest'){const next=decision.action==='retry'?decision.retryAt:new Date(Date.now()+source.crawl_interval_minutes*60000).toISOString();await admin.from('sources').update({last_crawled_at:new Date().toISOString(),next_crawl_at:next,etag:'etag'in decision?decision.etag??source.etag:source.etag,consecutive_failures:decision.action==='retry'?source.consecutive_failures+1:0,...(decision.action==='disable'?{active:false,disabled_reason:'HTTP access disabled'}:{})}).eq('id',source.id);await admin.from('ingestion_runs').update({finished_at:new Date().toISOString(),outcome:decision.action,http_status:res.status,retry_at:decision.action==='retry'?decision.retryAt:null}).eq('id',run.data.id);return {accepted:0}}
  const raw=(await res.text()).slice(0,3000001);const ct=res.headers.get('content-type')??'';const isDirectoryPage=!(ct.includes('json')||ct.includes('xml')||source.source_type==='rss');const items=ct.includes('json')?parseJsonFeed(raw):ct.includes('xml')||source.source_type==='rss'?parseSyndicationFeed(raw):parseOfficialPage(raw,target.href);
  let accepted=0;const budget={used:0};const baseHost=new URL(source.base_url).hostname.toLowerCase();for(const item of items){if(!item.description)continue;try{
    // Directory pages link OUT to the opportunities; self-host links are
    // navigation/info pages, not listings — drop them before they can
    // validate on the shared page body. Newsroom links are press
    // announcements, not claim portals — the one IRS newsroom link on the
    // USA.gov page is about a rebate whose filing deadline is long past,
    // so it must not publish as an evergreen listing.
    if(isDirectoryPage){let linkHost='';try{linkHost=new URL(item.link??'').hostname.toLowerCase()}catch{continue}if(linkHost===baseHost)continue;if(new URL(item.link??'').pathname.toLowerCase().includes('/newsroom/'))continue}
    // Directory pages have no per-item deadline: the page body is shared
    // by every link, so a date in it is a "last updated" stamp, not a claim
    // deadline (USAGov's was past → every item failed as "expired").
    // Evergreen items get the sentinel deadline instead; category still
    // comes from the title + shared body.
    let extracted=isDirectoryPage?extractCandidateWithDeadline(item,EVERGREEN_DEADLINE):extractCandidateFromFeedItem(item);if(!extracted)extracted=await tryArticleDeadline(admin,source,item,budget);if(!extracted)continue;const draft=validateCandidate(extracted,{id:source.id,allowedHosts:source.allowed_hosts},new Date(),{allowGovHosts:isDirectoryPage});const existing=await admin.from('opportunities').select('id,title,summary,eligibility_text,canonical_url').in('status',['review','published']).limit(200);const vector=textFeatureEmbedding(`${draft.title} ${draft.summary} ${draft.eligibilityText}`);if((existing.data??[]).some(x=>x.canonical_url===draft.canonicalUrl||cosineSimilarity(vector,textFeatureEmbedding(`${x.title} ${x.summary} ${x.eligibility_text}`))>=0.92))continue;const nowIso=new Date().toISOString();const ins=await admin.from('opportunities').insert({source_id:source.id,title:draft.title,summary:draft.summary,category:draft.category,claim_url:draft.claimUrl,canonical_url:draft.canonicalUrl,eligibility_text:draft.eligibilityText,deadline:draft.deadline,proof_required:draft.proofRequired,status:'published',reviewed_at:nowIso,content_embedding:vector,embedding_model:'lo-lyfe-feature-v1',embedded_at:nowIso}).select('*').single();if(!ins.error&&ins.data){accepted++;try{await admin.from('opportunity_versions').insert({opportunity_id:ins.data.id,snapshot:ins.data})}catch{/* audit snapshot is best-effort; the listing is already published */}}}catch{/* unstructured/invalid facts stay out of catalog */}}
  const next=new Date(Date.now()+source.crawl_interval_minutes*60000).toISOString();await admin.from('sources').update({last_crawled_at:new Date().toISOString(),next_crawl_at:next,etag:res.headers.get('etag'),consecutive_failures:0,last_yield:accepted,robots_checked_at:new Date().toISOString()}).eq('id',source.id);await admin.from('ingestion_runs').update({finished_at:new Date().toISOString(),outcome:'success',http_status:res.status,candidates_found:items.length,candidates_accepted:accepted}).eq('id',run.data.id);return{accepted}
 }catch(e){const code=e instanceof Error?e.message.slice(0,120):'UNKNOWN';const now=new Date();if(code==='ROBOTS_DENIED'){await admin.from('ingestion_runs').update({finished_at:now.toISOString(),outcome:'disabled',error_code:code}).eq('id',run.data.id);await admin.from('sources').update({active:false,disabled_reason:'robots.txt disallows crawling',robots_checked_at:now.toISOString()}).eq('id',source.id);return{accepted:0,error:code}}if(source.consecutive_failures>=4){await admin.from('ingestion_runs').update({finished_at:now.toISOString(),outcome:'disabled',error_code:code}).eq('id',run.data.id);await admin.from('sources').update({active:false,disabled_reason:`Repeated failures: ${code}`,last_crawled_at:now.toISOString(),robots_checked_at:now.toISOString()}).eq('id',source.id);return{accepted:0,error:code}}const retryAt=new Date(now.getTime()+Math.min(60,2**Math.max(0,source.consecutive_failures))*60_000).toISOString();await admin.from('sources').update({last_crawled_at:now.toISOString(),next_crawl_at:retryAt,consecutive_failures:source.consecutive_failures+1}).eq('id',source.id);await admin.from('ingestion_runs').update({finished_at:now.toISOString(),outcome:'retry',error_code:code,retry_at:retryAt}).eq('id',run.data.id);return{accepted:0,error:code}}
}
