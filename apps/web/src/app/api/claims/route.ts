import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { parseSaveRequest } from '../../../lib/save-request';
import { parseProgressRequest, parseSubmitRequest } from '../../../lib/claim-request';

async function authenticated() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return { client, user: error ? null : user };
}

export async function GET() {
  const { client, user } = await authenticated();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const { data, error } = await client.from('claims').select('id,opportunity_id,status,attested_at,submitted_at,created_at,opportunities(title,claim_url)')
    .eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load claims' }, { status: 500 });
  return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  const { client, user } = await authenticated();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  let body: { opportunityId: string };
  try { body = parseSaveRequest(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 }); }
  const { data: opportunity, error: opportunityError } = await client.from('opportunities').select('id,deadline')
    .eq('id', body.opportunityId).eq('status', 'published').not('reviewed_at', 'is', null).maybeSingle();
  if (opportunityError || !opportunity || (opportunity.deadline && new Date(opportunity.deadline).getTime() < Date.now()))
    return NextResponse.json({ error: 'Reviewed opportunity is unavailable' }, { status: 404 });
  const { data, error } = await client.from('claims')
    .insert({ user_id: user.id, opportunity_id: opportunity.id, status: 'started' })
    .select('id,opportunity_id,status').single();
  if (error?.code === '23505') {
    const existing = await client.from('claims').select('id,opportunity_id,status')
      .eq('user_id', user.id).eq('opportunity_id', body.opportunityId).single();
    if (!existing.error) return NextResponse.json({ claim: existing.data }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (error) return NextResponse.json({ error: 'Could not start claim' }, { status: 400 });
  return NextResponse.json({ claim: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: NextRequest) {
  const { client, user } = await authenticated();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const raw = await request.json();
  let body: { claimId: string; attested: true };
  try { body = parseSubmitRequest(raw); }
  catch {
    try { const progress = parseProgressRequest(raw); const { data, error } = await client.from('claims').update({ status: progress.status }).eq('id', progress.claimId).eq('user_id', user.id).in('status', ['submitted','pending']).select('id,opportunity_id,status').maybeSingle(); if (error || !data) return NextResponse.json({ error: 'Invalid claim transition' }, { status: 409 }); return NextResponse.json({ claim: data }, { headers: { 'Cache-Control': 'private, no-store' } }); }
    catch { return NextResponse.json({ error: 'Review and attest before submission' }, { status: 400 }); }
  }
  const { data, error } = await client.from('claims').update({ status: 'submitted' })
    .eq('id', body.claimId).eq('user_id', user.id).eq('status', 'started')
    .select('id,opportunity_id,status,attested_at,submitted_at').maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Claim is unavailable or already submitted' }, { status: 409 });
  return NextResponse.json({ claim: data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
