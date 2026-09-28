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

export { findLikelyDuplicate, lifecycleStatus, textSimilarity } from './dedupe.ts';
export type { DedupeRecord } from './dedupe.ts';

export { parseOfficialPage } from './official-page.ts';
export { extractionContract, feedItemExtractionInput, parseStrictExtraction } from './extractors.ts';
export type { ExtractedCandidate } from './extractors.ts';

export { isRobotsAllowed, parseRobotsTxt } from './robots.ts';
export type { RobotsRules } from './robots.ts';
export { cosineSimilarity, textFeatureEmbedding } from './embedding.ts';

export { parseDiscordApi, parseRedditApi, parseTelegramBotApi } from './community-connectors.ts';

export { explainEligibility, rankOpportunities } from './ranking.ts';
export { parseEligibilityRules } from './rule-parser.ts';
export type { ParsedRule } from './rule-parser.ts';
