import { parseSaveRequest } from './save-request.ts';

export function parseSubmitRequest(value: unknown): { claimId: string; attested: true } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid submission');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 2 || data.attested !== true) throw new Error('Invalid submission');
  const { opportunityId: claimId } = parseSaveRequest({ opportunityId: data.claimId });
  return { claimId, attested: true };
}
