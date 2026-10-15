import type { FeedItem } from './connectors.ts';

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
}
function text(value: string): string {
  return decodeHtml(value.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
}

/** Strip an HTML document down to visible text (scripts/styles removed). */
export function htmlToText(html: string): string {
  return text(html);
}

/** Extract bounded, visible facts and links from an already-approved public page. Network policy is enforced before this parser is called. */
export function parseOfficialPage(html: string, pageUrl: string): FeedItem[] {
  if (html.length > 3_000_000) throw new Error('Page exceeds size limit');
  const base = new URL(pageUrl);
  if (base.protocol !== 'https:') throw new Error('Official page must use HTTPS');
  // Directory pages carry their navigation in header/nav/footer/aside; the
  // opportunity links live in the main content. Strip the chrome before
  // extracting links and body text, or every nav link ("Home", "About"...)
  // becomes a phantom opportunity sharing the page body.
  const contentHtml = html.replace(/<(header|nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const headingMatch = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const body = text(contentHtml).slice(0, 30_000);
  const title = text(headingMatch?.[1] ?? titleMatch?.[1] ?? '').slice(0, 500) || undefined;
  const links: FeedItem[] = [];
  for (const match of [...contentHtml.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].slice(0, 250)) {
    try {
      const url = new URL(decodeHtml(match[1]), base);
      if (url.protocol !== 'https:') continue;
      // Text-less links are share buttons / icon links, not opportunities.
      const linkTitle = text(match[2]).slice(0, 500);
      if (!linkTitle) continue;
      links.push({
        title: linkTitle,
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
