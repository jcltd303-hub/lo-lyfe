import { NextResponse, type NextRequest } from 'next/server';
import { isAuthorizedCronRequest } from '../../../../lib/cron-auth';
import { ingestSource } from '../../../../lib/ingestion-worker';
import { createAdminClient } from '../../../../lib/supabase/admin';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 if(!isAuthorizedCronRequest(request.headers.get('authorization')))return NextResponse.json({error:'Unauthorized'},{status:401});
 const admin=createAdminClient(),now=new Date().toISOString();
 const {data,error}=await admin.from('sources').select('id,name,source_type,base_url,crawl_interval_minutes,allowed_hosts,etag,consecutive_failures').eq('active',true).or(`next_crawl_at.is.null,next_crawl_at.lte.${now}`).order('next_crawl_at',{ascending:true,nullsFirst:true}).limit(5);
 if(error)return NextResponse.json({error:'Could not load ingestion queue'},{status:500});
 const results=[];for(const source of data??[])results.push({sourceId:source.id,...await ingestSource(admin,source)});
 return NextResponse.json({processed:results.length,results,checkedAt:now},{headers:{'Cache-Control':'private, no-store'}});
}
