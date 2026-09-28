export type ReviewAction = 'publish' | 'reject';

export function parseReviewAction(value: unknown): ReviewAction {
  if (value === 'publish' || value === 'reject') return value;
  throw new Error('Invalid review action');
}

export function reviewPatch(action: ReviewAction, now = new Date().toISOString()) {
  return action === 'publish'
    ? { status: 'published' as const, reviewed_at: now, updated_at: now }
    : { status: 'rejected' as const, reviewed_at: now, updated_at: now };
}
