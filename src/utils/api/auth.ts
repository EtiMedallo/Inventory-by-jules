import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function verifyApiKey() {
  const headersList = await headers();
  const apiKey = headersList.get('X-Api-Key') || headersList.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return { error: 'Missing API Key', status: 401 };
  }

  // Example API key format: ayp_sandbox_8chars_hash
  const parts = apiKey.split('_');
  if (parts.length < 3) {
      return { error: 'Invalid API Key format', status: 401 };
  }
  const prefix = parts[2].substring(0, 8);
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const supabase = await createClient();

  // We must use a service role key if we want to bypass RLS to lookup the key hash,
  // but since we are in server context, let's query standard and see if RLS blocks it.
  // Actually, we should just query it directly. If we need to bypass, we will use supabase admin.
  // For now, let's just query by hash.
  // Wait, api_keys is RLS protected! We need an admin client to verify keys from the public API endpoint.
  // To avoid exposing the service role here, let's create a server admin client or just use standard edge functions.
  // Let's use the service role key for this specific lookup.

  const adminSupabase = await import('@supabase/supabase-js').then(mod => {
      return mod.createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
  });

  const { data, error } = await adminSupabase
    .from('api_keys')
    .select('id, organization_id, scopes, environment')
    .eq('key_hash', hash)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { error: 'Invalid or inactive API Key', status: 401 };
  }

  // Update last_used_at (non-blocking)
  adminSupabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then();

  return { organizationId: data.organization_id, scopes: data.scopes, environment: data.environment };
}
