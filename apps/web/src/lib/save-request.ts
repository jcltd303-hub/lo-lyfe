export function parseSaveRequest(value: unknown): { opportunityId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 1 || typeof data.opportunityId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.opportunityId)) {
    throw new Error('Invalid request');
  }
  return { opportunityId: data.opportunityId };
}
