import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { parseSaveRequest } from '../../../lib/save-request';

async function authenticated() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return { client, user: error ? null : user };
}

export async function GET() {
  const { client, user } = await authenticated();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { data, error } = await client.from('saved_opportunities')
    .select('opportunity_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load saved items' }, { status: 500 });
  return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  const { client, user } = await authenticated();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  let body: { opportunityId: string };
  try { body = parseSaveRequest(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 }); }
  const { error } = await client.from('saved_opportunities').insert({ user_id: user.id, opportunity_id: body.opportunityId });
  if (error && error.code !== '23505') return NextResponse.json({ error: 'Listing could not be saved' }, { status: 400 });
  return NextResponse.json({ opportunityId: body.opportunityId }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function DELETE(request: NextRequest) {
  const { client, user } = await authenticated();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  let body: { opportunityId: string };
  try { body = parseSaveRequest(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 }); }
  const { error } = await client.from('saved_opportunities').delete()
    .eq('user_id', user.id).eq('opportunity_id', body.opportunityId);
  if (error) return NextResponse.json({ error: 'Could not remove saved item' }, { status: 400 });
  return NextResponse.json({ opportunityId: body.opportunityId }, { headers: { 'Cache-Control': 'private, no-store' } });
}
