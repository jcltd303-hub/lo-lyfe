export interface DedupeRecord {
  id: string;
  canonicalUrl: string;
  title: string;
  summary: string;
  deadline: string;
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(word => word.length > 2));
}

export function textSimilarity(a: string, b: string): number {
  const left = tokens(a); const right = tokens(b);
  if (!left.size && !right.size) return 1;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return intersection / (left.size + right.size - intersection);
}

/** Cheap deterministic pre-dedupe. Embedding similarity can run after this without wasting model calls on obvious duplicates. */
export function findLikelyDuplicate(candidate: Omit<DedupeRecord, 'id'>, existing: DedupeRecord[], threshold = 0.72): DedupeRecord | undefined {
  const exact = existing.find(row => row.canonicalUrl === candidate.canonicalUrl);
  if (exact) return exact;
  return existing.find(row =>
    row.deadline === candidate.deadline &&
    textSimilarity(`${row.title} ${row.summary}`, `${candidate.title} ${candidate.summary}`) >= threshold
  );
}

export function lifecycleStatus(deadline: string, httpStatus: number | null, now = new Date()): 'active' | 'expired' | 'dead-link' | 'retry' {
  if (deadline < now.toISOString().slice(0, 10)) return 'expired';
  if (httpStatus === null || httpStatus === 408 || httpStatus === 429 || (httpStatus >= 500 && httpStatus <= 599)) return 'retry';
  if (httpStatus === 404 || httpStatus === 410) return 'dead-link';
  return 'active';
}
