import { NextResponse, type NextRequest } from 'next/server';
import { safeReturnPath } from '../../../lib/auth-path';
import { createClient } from '../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeReturnPath(request.nextUrl.searchParams.get('next'));
  if (!code) return NextResponse.redirect(new URL('/auth?error=missing-code', request.url));
  const client = await createClient();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/auth?error=invalid-link', request.url));
  return NextResponse.redirect(new URL(next, request.url));
}
