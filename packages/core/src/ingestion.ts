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

export type ReviewDraft = Candidate & {
  sourceId: string;
  canonicalUrl: string;
  status: 'review';
};

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
