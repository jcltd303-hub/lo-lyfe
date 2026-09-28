import type { FeedItem } from './connectors.ts';
function bounded(raw:string){if(raw.length>2_000_000)throw new Error('API payload exceeds size limit');return JSON.parse(raw) as unknown}
function s(v:unknown){return typeof v==='string'?v:undefined}
/** Parse Reddit's official API listing response. Fetch/auth/rate-limit policy stays in the server connector. */
export function parseRedditApi(raw:string):FeedItem[]{const x=bounded(raw) as {data?:{children?:Array<{data?:Record<string,unknown>}>}};const rows=x.data?.children;if(!Array.isArray(rows))throw new Error('Invalid Reddit API listing');return rows.slice(0,250).map(r=>({title:s(r.data?.title),link:s(r.data?.url),description:s(r.data?.selftext),publishedAt:typeof r.data?.created_utc==='number'?new Date(r.data.created_utc*1000).toISOString():undefined}))}
/** Parse Discord's official REST API message array; only public/authorized channels may be supplied. */
export function parseDiscordApi(raw:string):FeedItem[]{const x=bounded(raw);if(!Array.isArray(x))throw new Error('Invalid Discord API response');return x.slice(0,100).map((r:unknown)=>{const o=r as Record<string,unknown>;return{description:s(o.content),publishedAt:s(o.timestamp)}})}
/** Parse Telegram Bot API updates; only explicitly authorized public channels may be supplied. */
export function parseTelegramBotApi(raw:string):FeedItem[]{const x=bounded(raw) as {ok?:boolean;result?:unknown[]};if(x.ok!==true||!Array.isArray(x.result))throw new Error('Invalid Telegram Bot API response');return x.result.slice(0,100).map(v=>{const u=v as {channel_post?:Record<string,unknown>};const p=u.channel_post??{};return{description:s(p.text),publishedAt:typeof p.date==='number'?new Date(p.date*1000).toISOString():undefined}})}
