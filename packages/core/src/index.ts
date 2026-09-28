export { evaluateEligibility, filterOpportunities } from './eligibility.ts';
export { sampleOpportunities } from './opportunities.ts';
export type { Category, Opportunity } from './opportunities.ts';
export type { Eligibility, Profile } from './eligibility.ts';
export { missingProfileFields } from './profile.ts';
export type { FieldDefinition, ProfileAnswers } from './profile.ts';
export { assertApprovedFetchUrl, canonicalizeClaimUrl, classifyFetchResponse, isSourceDue, validateCandidate } from './ingestion.ts';
export type { Candidate, CrawlSource, FetchDecision, Source, ReviewDraft } from './ingestion.ts';

export { parseJsonFeed, parseSyndicationFeed } from './connectors.ts';
export type { FeedItem } from './connectors.ts';
