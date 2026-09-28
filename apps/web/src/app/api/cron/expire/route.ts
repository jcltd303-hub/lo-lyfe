import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '../../../../lib/cron-auth';
import { createAdminClient } from '../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin.from('opportunities')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .lt('deadline', today)
    .in('status', ['draft', 'review', 'published'])
    .select('id');
  if (error) return NextResponse.json({ error: 'Could not expire opportunities' }, { status: 500 });
  return NextResponse.json({ expired: data?.length ?? 0, checkedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'private, no-store' } });
}
