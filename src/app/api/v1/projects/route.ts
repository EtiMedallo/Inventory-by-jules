import { NextResponse } from 'next/server';
import { verifyApiKey } from '@/utils/api/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const auth = await verifyApiKey();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Ensure they have the read:projects scope
  if (!auth.scopes.includes('read:projects') && !auth.scopes.includes('admin')) {
      return NextResponse.json({ error: 'Insufficient scope. Requires read:projects' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error, count } = await adminSupabase
    .from('projects')
    .select('id, name, slug, description, currency, is_public, created_at', { count: 'exact' })
    .eq('organization_id', auth.organizationId)
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    meta: {
      total: count,
      limit,
      offset
    }
  });
}
