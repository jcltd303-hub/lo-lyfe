import type { Category } from './opportunities.ts';

export interface Candidate {
  title: string;
  summary: string;
  category: Category;
  claimUrl: string;
  deadline: string;
  eligibilityText: string;
  proofRequired: string[];
}

export interface Source {
  id: string;
  allowedHosts: string[];
}

export interface CrawlSource extends Source {
  baseUrl: string;
  crawlIntervalMinutes: number;
  active: boolean;
  lastCrawledAt?: string | null;
  consecutiveFailures?: number;
}

export type ReviewDraft = Candidate & {
  sourceId: string;
  canonicalUrl: string;
  status: 'review';
};

export type FetchDecision =
  | { action: 'ingest'; etag?: string; retryAt?: never }
  | { action: 'unchanged'; etag?: string; retryAt?: never }
  | { action: 'retry'; retryAt: string; etag?: never }
  | { action: 'disable'; retryAt?: never; etag?: never };

const categories = new Set<Category>(['settlement', 'refund', 'grant', 'freebie', 'coupon']);

export function canonicalizeClaimUrl(raw: string): string {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('Invalid claim URL'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw new Error('Claim URL must be an unauthenticated HTTPS destination');
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key.toLowerCase())) url.searchParams.delete(key);
  }
  return url.toString();
}

/** Validate an extracted record before human review. This does not publish it. */
export function validateCandidate(candidate: Candidate, source: Source, now = new Date()): ReviewDraft {
  if (!candidate.title?.trim() || !candidate.summary?.trim() || !candidate.eligibilityText?.trim()) {
    throw new Error('Title, summary, and eligibility are required');
  }
  if (!categories.has(candidate.category)) throw new Error('Unknown category');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.deadline)) throw new Error('Valid deadline required');
  const deadline = new Date(`${candidate.deadline}T00:00:00Z`);
  if (!Number.isFinite(deadline.getTime()) || deadline.toISOString().slice(0, 10) !== candidate.deadline) {
    throw new Error('Valid deadline required');
  }
  if (candidate.deadline < now.toISOString().slice(0, 10)) throw new Error('Expired opportunity');
  const canonicalUrl = canonicalizeClaimUrl(candidate.claimUrl);
  const host = new URL(canonicalUrl).hostname.toLowerCase();
  if (!source.allowedHosts.some(allowed => host === allowed.toLowerCase())) {
    throw new Error('Claim URL is outside the approved source');
  }
  if (!source.id.trim()) throw new Error('Source ID required');
  return { ...candidate, sourceId: source.id, canonicalUrl, status: 'review' };
}

/** Scheduler guard: inactive sources never run and active sources run only when their cadence is due. */
export function isSourceDue(source: CrawlSource, now = new Date()): boolean {
  if (!source.active) return false;
  if (!source.lastCrawledAt) return true;
  const last = new Date(source.lastCrawledAt).getTime();
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= source.crawlIntervalMinutes * 60_000;
}

/** Enforce that the crawler never leaves the approved source host before making a request. */
export function assertApprovedFetchUrl(raw: string, source: CrawlSource): URL {
  const url = new URL(raw, source.baseUrl);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Unsafe source URL');
  const base = new URL(source.baseUrl);
  const allowed = new Set([base.hostname.toLowerCase(), ...source.allowedHosts.map(host => host.toLowerCase())]);
  if (!allowed.has(url.hostname.toLowerCase())) throw new Error('Fetch URL is outside the approved source');
  return url;
}

/** Turn HTTP outcomes into deterministic scheduler actions. The caller must still obey robots.txt before fetching. */
export function classifyFetchResponse(
  status: number,
  headers: Record<string, string | undefined>,
  now = new Date(),
  consecutiveFailures = 0,
): FetchDecision {
  const etag = headers.etag;
  if (status === 304) return { action: 'unchanged', ...(etag ? { etag } : {}) };
  if (status >= 200 && status < 300) return { action: 'ingest', ...(etag ? { etag } : {}) };
  if (status === 401 || status === 403 || status === 451 || consecutiveFailures >= 4) return { action: 'disable' };

  const retryAfter = headers['retry-after'];
  let retryAt: Date;
  if (retryAfter && /^\d+$/.test(retryAfter)) retryAt = new Date(now.getTime() + Number(retryAfter) * 1000);
  else if (retryAfter && Number.isFinite(Date.parse(retryAfter))) retryAt = new Date(retryAfter);
  else retryAt = new Date(now.getTime() + Math.min(60, 2 ** Math.max(0, consecutiveFailures)) * 60_000);
  return { action: 'retry', retryAt: retryAt.toISOString() };
}
