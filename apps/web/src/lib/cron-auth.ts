import { timingSafeEqual } from 'node:crypto';

export function isAuthorizedCronRequest(authorization: string | null, secret = process.env.CRON_SECRET): boolean {
  if (!secret || !authorization?.startsWith('Bearer ')) return false;
  const supplied = authorization.slice('Bearer '.length);
  const a = Buffer.from(supplied);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
