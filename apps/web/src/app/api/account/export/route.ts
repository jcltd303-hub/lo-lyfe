import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { buildAccountExport } from '../../../../lib/account-export';

export async function GET() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const [saved, claims] = await Promise.all([
    client.from('saved_opportunities').select('opportunity_id,created_at').eq('user_id', user.id),
    client.from('claims').select('id,opportunity_id,status,attested_at,submitted_at,created_at').eq('user_id', user.id),
  ]);
  if (saved.error || claims.error) return NextResponse.json({ error: 'Could not export account' }, { status: 500 });
  const claimIds = (claims.data ?? []).map(claim => claim.id);
  const payouts = claimIds.length ? await client.from('payouts')
    .select('claim_id,amount_cents,currency,confirmed_at,created_at').in('claim_id', claimIds) : null;
  if (payouts?.error) return NextResponse.json({ error: 'Could not export account' }, { status: 500 });
  const payload = buildAccountExport(user.id, user.email, saved.data ?? [], claims.data ?? [], payouts?.data ?? []);
  return new NextResponse(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="lo-lyfe-account.json"',
      'Cache-Control': 'private, no-store',
    },
  });
}
