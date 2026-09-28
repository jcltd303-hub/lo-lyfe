import type { Candidate } from './ingestion.ts';
import type { FeedItem } from './connectors.ts';

const categories = ['settlement','refund','grant','freebie','coupon'] as const;
type ExtractedCategory = typeof categories[number];

export interface ExtractedCandidate extends Candidate {
  confidence: number;
  warnings: string[];
}

function stringField(value: unknown, name: string, max = 10_000): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  const clean = value.trim();
  if (clean.length > max) throw new Error(`${name} is too long`);
  return clean;
}

export function parseStrictExtraction(raw: string): ExtractedCandidate {
  if (raw.length > 100_000) throw new Error('Extraction payload too large');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Extraction must be valid JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Extraction must be an object');
  const o = value as Record<string, unknown>;
  const allowed = new Set(['title','summary','category','claimUrl','deadline','eligibilityText','proofRequired','confidence','warnings']);
  for (const key of Object.keys(o)) if (!allowed.has(key)) throw new Error(`Unknown extraction field: ${key}`);
  if (!categories.includes(o.category as ExtractedCategory)) throw new Error('Unknown category');
  if (!Array.isArray(o.proofRequired) || !o.proofRequired.every(x => typeof x === 'string')) throw new Error('proofRequired must be a string array');
  if (typeof o.confidence !== 'number' || o.confidence < 0 || o.confidence > 1) throw new Error('confidence must be between 0 and 1');
  if (!Array.isArray(o.warnings) || !o.warnings.every(x => typeof x === 'string')) throw new Error('warnings must be a string array');
  return {
    title: stringField(o.title, 'title', 500),
    summary: stringField(o.summary, 'summary'),
    category: o.category as ExtractedCategory,
    claimUrl: stringField(o.claimUrl, 'claimUrl', 2_000),
    deadline: stringField(o.deadline, 'deadline', 10),
    eligibilityText: stringField(o.eligibilityText, 'eligibilityText'),
    proofRequired: o.proofRequired.map(x => x.trim()).filter(Boolean).slice(0, 25),
    confidence: o.confidence,
    warnings: o.warnings.map(x => x.trim()).filter(Boolean).slice(0, 25),
  };
}

export function feedItemExtractionInput(item: FeedItem): string {
  return JSON.stringify({
    title: item.title ?? null,
    url: item.link ?? null,
    description: item.description ?? null,
    publishedAt: item.publishedAt ?? null,
  });
}

export const extractionContract = {
  instruction: 'Extract only facts explicitly supported by the supplied official-source content. Do not infer missing deadline, eligibility, payout, or claim URL. Return JSON only. This output is a draft for human review and must never be published automatically.',
  required: ['title','summary','category','claimUrl','deadline','eligibilityText','proofRequired','confidence','warnings'],
} as const;
