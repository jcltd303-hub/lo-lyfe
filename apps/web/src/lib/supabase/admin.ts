import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error('Server Supabase administration is not configured');
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
