import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We map generic incoming webhook providers
// Typically providers will pass a unique token in the URL or headers to identify the organization.
// For this general endpoint, we assume the provider sends an `org_token` query param or we look it up.
// Here we do a basic implementation that logs the payload.

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
    const provider = (await params).provider;
    const { searchParams } = new URL(request.url);
    const orgToken = searchParams.get('token'); // We could map this to an organization

    if (!orgToken) {
        return NextResponse.json({ error: 'Missing organization token' }, { status: 401 });
    }

    try {
        const payload = await request.json();

        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Map token to organization (Assuming we use api_keys table for this mapping for now, or a specific integration table)
        // For demonstration, we just log it to integration_logs if we can find the org.
        const { data: apiKey } = await adminSupabase
            .from('api_keys')
            .select('organization_id')
            .eq('key_hash', orgToken) // In a real app we might use a dedicated webhook token
            .single();

        const organizationId = apiKey?.organization_id;

        // If no org found via token, we can't process it correctly, but we log an error
        if (!organizationId) {
             return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Store the incoming webhook payload
        await adminSupabase.from('integration_logs').insert({
            organization_id: organizationId,
            provider: provider,
            action: 'incoming_webhook',
            status: 'success',
            details: payload
        });

        // Depending on provider (e.g. kommo, zapier), we could parse the payload and create a Lead.
        // For now, we just acknowledge receipt.

        return NextResponse.json({ status: 'ok', provider, logged: true }, { status: 200 });

    } catch (e: unknown) {
        return NextResponse.json({ error: 'Failed to process webhook', details: (e as Error).message }, { status: 500 });
    }
}
