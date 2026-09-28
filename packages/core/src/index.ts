export { evaluateEligibility, filterOpportunities } from './eligibility.ts';
export { sampleOpportunities } from './opportunities.ts';
export type { Category, Opportunity } from './opportunities.ts';
export type { Eligibility, Profile } from './eligibility.ts';
export { missingProfileFields } from './profile.ts';
export type { FieldDefinition, ProfileAnswers } from './profile.ts';
export { canonicalizeClaimUrl, validateCandidate } from './ingestion.ts';
export type { Candidate, Source, ReviewDraft } from './ingestion.ts';
