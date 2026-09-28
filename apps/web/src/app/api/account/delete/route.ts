import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { assertDeleteConfirmation } from '../../../../lib/account-delete';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); assertDeleteConfirmation(body); }
  catch { return NextResponse.json({ error: 'Confirmation required' }, { status: 400 }); }

  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return NextResponse.json({ error: 'Account deletion is temporarily unavailable' }, { status: 503 });
  const admin = createAdminClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const result = await admin.auth.admin.deleteUser(user.id);
  if (result.error) return NextResponse.json({ error: 'Could not delete account' }, { status: 500 });
  await client.auth.signOut();
  return NextResponse.json({ deleted: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
