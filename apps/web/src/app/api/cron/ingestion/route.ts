import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '../../../../lib/cron-auth';
import { createAdminClient } from '../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('sources')
    .select('id,name,source_type,base_url,crawl_interval_minutes,allowed_hosts,etag,next_crawl_at,last_crawled_at,consecutive_failures')
    .eq('active', true)
    .or(`next_crawl_at.is.null,next_crawl_at.lte.${now}`)
    .order('next_crawl_at', { ascending: true, nullsFirst: true })
    .limit(25);

  if (error) return NextResponse.json({ error: 'Could not load ingestion queue' }, { status: 500 });
  return NextResponse.json(
    { due: data ?? [], checkedAt: now },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
