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
    if (match?.[1]) return decodeXml(match[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  }
}

function atomLink(block: string): string | undefined {
  const match = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] ? decodeXml(match[1]) : undefined;
}

/** Minimal RSS/Atom parser for public official feeds. It deliberately returns raw feed facts, not publishable opportunities. */
export function parseSyndicationFeed(xml: string): FeedItem[] {
  if (xml.length > 2_000_000) throw new Error('Feed exceeds size limit');
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(match => match[2]);
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
  url?: unknown;
  external_url?: unknown;
  content_text?: unknown;
  summary?: unknown;
  date_published?: unknown;
}

/** Parse JSON Feed without trusting arbitrary fields or allowing unbounded payloads. */
export function parseJsonFeed(raw: string): FeedItem[] {
  if (raw.length > 2_000_000) throw new Error('Feed exceeds size limit');
  const parsed = JSON.parse(raw) as { items?: JsonFeedItem[] };
  if (!Array.isArray(parsed.items)) throw new Error('JSON feed items are required');
  return parsed.items.slice(0, 250).map(item => ({
    title: typeof item.title === 'string' ? item.title.trim() : undefined,
    link: typeof item.external_url === 'string' ? item.external_url : typeof item.url === 'string' ? item.url : undefined,
    description: typeof item.content_text === 'string' ? item.content_text : typeof item.summary === 'string' ? item.summary : undefined,
    publishedAt: typeof item.date_published === 'string' ? item.date_published : undefined,
  }));
}
