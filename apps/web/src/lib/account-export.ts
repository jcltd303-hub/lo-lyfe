export function buildAccountExport<S, C, P>(userId: string, email: string | undefined, saved: S[], claims: C[], payouts: P[]) {
  return { userId, email: email ?? null, saved, claims, payouts };
}
