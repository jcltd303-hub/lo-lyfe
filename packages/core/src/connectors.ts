export interface FeedItem {
  title?: string;
  link?: string;
  description?: string;
  publishedAt?: string;
}

function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
}

function textTag(block: string, names: string[]): string | undefined {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
    if (match?.[1]) {
      const decoded = decodeXml(match[1]);
      return decoded.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
}

function atomLink(block: string): string | undefined {
  const match = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] ? decodeXml(match[1]) : undefined;
}

/** Minimal RSS/Atom parser for public official feeds. It deliberately returns raw feed facts, not publishable opportunities. */
export function parseSyndicationFeed(xml: string): FeedItem[] {
  // Oversized feeds used to throw and wedge the source at the head of the
  // crawl queue forever. Parse the first 2MB instead; entries cut off by
  // truncation don't match the closing-tag pattern and are skipped.
  const bounded = xml.length > 2_000_000 ? xml.slice(0, 2_000_000) : xml;
  const blocks = [...bounded.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(match => match[2]);
  if (!blocks.length) throw new Error('No RSS or Atom entries found');
  return blocks.slice(0, 250).map(block => ({
    title: textTag(block, ['title']),
    link: textTag(block, ['link']) ?? atomLink(block),
    description: textTag(block, ['description', 'summary', 'content']),
    publishedAt: textTag(block, ['pubDate', 'published', 'updated']),
  }));
}

export interface JsonFeedItem {
  title?: unknown;
  name?: unknown;
  url?: unknown;
  external_url?: unknown;
  html_url?: unknown;
  listing_url?: unknown;
  content_text?: unknown;
  summary?: unknown;
  abstract?: unknown;
  date_published?: unknown;
  publication_date?: unknown;
  // Settlement-dataset fields (e.g. Class Action Hero's { settlements: [...] }
  // payload): no title/description in feed shape, so the description is
  // synthesized from the structured fields below.
  eligibility?: unknown;
  fund?: unknown;
  deadline?: unknown;
  deadlineLabel?: unknown;
  proof_enum?: unknown;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Build a feed description for settlement-dataset records that carry
 * structured fields instead of prose. The wording is deliberate: it contains
 * the catalog's category keyword ("settlement") and a labeled claim deadline,
 * the two things candidate extraction requires, and states the proof terms
 * plainly so a synthesized listing never oversells a documented claim as
 * no-proof (or the reverse).
 */
function settlementDescription(item: JsonFeedItem): string | undefined {
  const eligibility = str(item.eligibility);
  if (!eligibility) return undefined;
  const parts = [eligibility.endsWith('.') ? eligibility : `${eligibility}.`, 'Class action settlement.'];
  const fund = str(item.fund);
  if (fund) parts.push(`Settlement fund: ${fund}.`);
  const deadline = str(item.deadlineLabel) ?? str(item.deadline);
  if (deadline) parts.push(`Claim deadline: ${deadline}.`);
  const proof = str(item.proof_enum);
  if (proof === 'none') parts.push('No proof required to file a claim.');
  else if (proof === 'notice_id_only') parts.push('No receipts or documents required; file with the claim ID from your settlement notice.');
  else if (proof === 'required') parts.push('Documentation is required to file a claim.');
  return parts.join(' ');
}

/** Parse JSON Feed without trusting arbitrary fields or allowing unbounded payloads. Also accepts API-style `{ results: [...] }` payloads (e.g. Federal Register) and settlement-dataset `{ settlements: [...] }` payloads (e.g. Class Action Hero) with common field aliases. */
export function parseJsonFeed(raw: string): FeedItem[] {
  if (raw.length > 2_000_000) throw new Error('Feed exceeds size limit');
  const parsed = JSON.parse(raw) as { items?: JsonFeedItem[]; results?: JsonFeedItem[]; settlements?: JsonFeedItem[] };
  const entries = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed.results) ? parsed.results : parsed.settlements;
  if (!Array.isArray(entries)) throw new Error('JSON feed items are required');
  return entries.slice(0, 250).map(item => ({
    title: typeof item.title === 'string' ? item.title.trim() : typeof item.name === 'string' ? item.name.trim() : undefined,
    // listing_url (a dataset's own per-record page) outranks the record's
    // official-site url: the claim-link host gate approves the dataset host,
    // not the hundreds of administrator domains the records point at.
    link: typeof item.external_url === 'string' ? item.external_url : typeof item.listing_url === 'string' ? item.listing_url : typeof item.url === 'string' ? item.url : typeof item.html_url === 'string' ? item.html_url : undefined,
    description: typeof item.content_text === 'string' ? item.content_text : typeof item.summary === 'string' ? item.summary : typeof item.abstract === 'string' ? item.abstract : settlementDescription(item),
    publishedAt: typeof item.date_published === 'string' ? item.date_published : typeof item.publication_date === 'string' ? item.publication_date : undefined,
  }));
}
