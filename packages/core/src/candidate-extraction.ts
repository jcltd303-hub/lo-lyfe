import type { FeedItem } from './connectors.ts';
import type { Candidate } from './ingestion.ts';

const months: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};

const MONTH_NAMES = 'January|February|March|April|May|June|July|August|September|October|November|December|Sept?\\.?|Oct\\.?|Nov\\.?|Dec\\.?|Jan\\.?|Feb\\.?|Mar\\.?|Apr\\.?|Jun\\.?|Jul\\.?|Aug\\.?';

/** A date in one of the formats feeds and articles actually use. */
const DATE_PATTERN =
  `\\b(20\\d{2})-(\\d{2})-(\\d{2})\\b` + // 2026-12-28
  `|\\b(\\d{1,2})/(\\d{1,2})/(20\\d{2})\\b` + // 12/28/2026 (US order)
  `|\\b(${MONTH_NAMES})\\s+(\\d{1,2}),\\s*(20\\d{2})\\b`; // December 28, 2026 / Nov. 27, 2026

function toIso(match: RegExpMatchArray): string | null {
  let y: number, m: number, d: number;
  if (match[1] !== undefined) {
    y = Number(match[1]); m = Number(match[2]); d = Number(match[3]);
  } else if (match[4] !== undefined) {
    m = Number(match[4]); d = Number(match[5]); y = Number(match[6]);
  } else {
    const key = (match[7] ?? '').toLowerCase().replace('.', '');
    m = months[key];
    if (!m) return null;
    d = Number(match[8]); y = Number(match[9]);
  }
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // Reject impossible calendar dates (e.g. February 30).
  if (new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

/** First valid calendar date within `window` chars after a label, or null. */
function datedAfter(text: string, label: RegExp, window = 160): string | null {
  const at = text.search(label);
  if (at < 0) return null;
  const windowText = text.slice(at, at + window);
  const re = new RegExp(DATE_PATTERN, 'i');
  const found = windowText.match(re);
  return found ? toIso(found) : null;
}

/**
 * Extract a deadline from free text.
 *
 * Deadline-labeled dates win over bare dates: a snippet/article that says
 * "Claim Form Deadline 12/28/2026" must not resolve to some earlier
 * publication or hearing date that happens to appear first. With
 * `labeledOnly`, bare dates are never accepted — the article stage uses
 * this so it cannot mistake a publication date for a claim deadline.
 * Without it, the first bare date is the fallback (feed-snippet behavior).
 */
export function extractDeadlineFromText(
  text: string,
  opts?: { labeledOnly?: boolean },
): string | null {
  const flat = text.replace(/\s+/g, ' ');
  const labeled =
    datedAfter(flat, /claim form deadline/i, 100) ??
    datedAfter(flat, /deadline to (file|submit)|claim deadline|deadline for (filing|exclusion|objection)|file (a )?claim by|submit (a )?claim by|claims? (must|should) be (filed|submitted) by|submit by|file by|apply by|applications? (are )?due|must be (filed|submitted|received) by|registration (ends|closes|deadline)/i, 160) ??
    datedAfter(flat, /deadline/i, 160) ??
    datedAfter(flat, /comments? must be received on or before|comment period (ends|closes)|comments? (are )?due/i, 160);
  if (labeled) return labeled;
  if (opts?.labeledOnly) return null;
  const bare = flat.match(new RegExp(DATE_PATTERN, 'i'));
  return bare ? toIso(bare) : null;
}

export function hasOpportunityCategory(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('settlement') ||
    lower.includes('refund') ||
    lower.includes('grant') ||
    lower.includes('coupon') ||
    /\bfree(?:bie|bies| item| sample)?\b/.test(lower)
  );
}

function categorize(text: string): Candidate['category'] | null {
  const lower = text.toLowerCase();
  if (lower.includes('settlement')) return 'settlement';
  if (lower.includes('refund')) return 'refund';
  if (lower.includes('grant')) return 'grant';
  if (lower.includes('coupon')) return 'coupon';
  if (/\bfree(?:bie|bies| item| sample)?\b/.test(lower)) return 'freebie';
  return null;
}

function baseCandidate(item: FeedItem): {
  title: string;
  body: string;
  claimUrl: string;
  category: Candidate['category'];
} | null {
  const title = item.title?.trim();
  const body = item.description?.trim();
  const rawUrl = item.link?.trim();
  if (!title || !body || !rawUrl) return null;
  let claimUrl: string;
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:') return null;
    claimUrl = u.href;
  } catch {
    return null;
  }
  const category = categorize(`${title} ${body}`);
  if (!category) return null;
  return { title, body, claimUrl, category };
}

function finish(
  base: NonNullable<ReturnType<typeof baseCandidate>>,
  deadline: string,
): Candidate {
  return {
    title: base.title.slice(0, 500),
    summary: base.body.slice(0, 10000),
    category: base.category,
    claimUrl: base.claimUrl,
    deadline,
    eligibilityText: base.body.slice(0, 10000),
    proofRequired: [],
  };
}

export function extractCandidateFromFeedItem(item: FeedItem): Candidate | null {
  const base = baseCandidate(item);
  if (!base) return null;
  const deadline = extractDeadlineFromText(base.body);
  if (!deadline) return null;
  return finish(base, deadline);
}

/**
 * Build a candidate from a feed item with a deadline found elsewhere —
 * the two-stage path: the feed snippet had no deadline, so the worker
 * fetched the linked article and extracted a deadline-labeled date from it.
 * Category/title/summary still come from the feed item itself.
 */
export function extractCandidateWithDeadline(
  item: FeedItem,
  deadline: string,
): Candidate | null {
  const base = baseCandidate(item);
  if (!base) return null;
  return finish(base, deadline);
}
