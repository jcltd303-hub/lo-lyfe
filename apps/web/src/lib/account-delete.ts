export function assertDeleteConfirmation(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid deletion request');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 1 || data.confirm !== 'DELETE MY ACCOUNT') throw new Error('Invalid deletion request');
}
