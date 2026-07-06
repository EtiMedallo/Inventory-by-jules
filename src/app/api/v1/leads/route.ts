import { NextResponse } from 'next/server';
import { verifyApiKey } from '@/utils/api/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const auth = await verifyApiKey();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!auth.scopes.includes('read:leads') && !auth.scopes.includes('admin')) {
      return NextResponse.json({ error: 'Insufficient scope. Requires read:leads' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const projectId = searchParams.get('project_id');

  const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = adminSupabase
    .from('leads')
    .select('id, project_id, name, email, phone, stage, source, status, score, created_at', { count: 'exact' })
    .eq('organization_id', auth.organizationId);

  if (projectId) {
      query = query.eq('project_id', projectId);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

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

export async function POST(request: Request) {
    const auth = await verifyApiKey();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!auth.scopes.includes('write:leads') && !auth.scopes.includes('admin')) {
        return NextResponse.json({ error: 'Insufficient scope. Requires write:leads' }, { status: 403 });
    }

    try {
        const body = await request.json();

        // Validate basic fields
        if (!body.project_id || !body.name) {
            return NextResponse.json({ error: 'Missing required fields: project_id, name' }, { status: 400 });
        }

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify project belongs to organization
        const { data: projectCheck } = await adminSupabase
            .from('projects')
            .select('id')
            .eq('id', body.project_id)
            .eq('organization_id', auth.organizationId)
            .single();

        if (!projectCheck) {
            return NextResponse.json({ error: 'Invalid project_id or project does not belong to your organization' }, { status: 400 });
        }

        const leadData = {
            organization_id: auth.organizationId,
            project_id: body.project_id,
            name: body.name,
            email: body.email || null,
            phone: body.phone || null,
            source: body.source || 'api',
            stage: body.stage || 'new',
            status: body.status || 'active',
            score: body.score || 'warm',
            notes: body.notes || null,
        };

        const { data, error } = await adminSupabase
            .from('leads')
            .insert(leadData)
            .select()
            .single();

        if (error) throw error;

        // Optionally, we could trigger an internal webhook here if we had one for lead.created

        return NextResponse.json({ data }, { status: 201 });

    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message || 'Internal error processing request' }, { status: 500 });
    }
}
