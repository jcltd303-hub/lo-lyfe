import type { FeedItem } from './connectors.ts';

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
}
function text(value: string): string {
  return decodeHtml(value.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
}

/** Extract bounded, visible facts and links from an already-approved public page. Network policy is enforced before this parser is called. */
export function parseOfficialPage(html: string, pageUrl: string): FeedItem[] {
  if (html.length > 3_000_000) throw new Error('Page exceeds size limit');
  const base = new URL(pageUrl);
  if (base.protocol !== 'https:') throw new Error('Official page must use HTTPS');
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const headingMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const body = text(html).slice(0, 30_000);
  const title = text(headingMatch?.[1] ?? titleMatch?.[1] ?? '').slice(0, 500) || undefined;
  const links: FeedItem[] = [];
  for (const match of [...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].slice(0, 250)) {
    try {
      const url = new URL(decodeHtml(match[1]), base);
      if (url.protocol !== 'https:') continue;
      const linkTitle = text(match[2]).slice(0, 500) || title;
      links.push({
        ...(linkTitle ? { title: linkTitle } : {}),
        link: url.href,
        description: body,
      });
    } catch {
      // Ignore malformed links in otherwise usable official pages.
    }
  }
  return links.length ? links : [{
    ...(title ? { title } : {}),
    link: base.href,
    description: body,
  }];
}
