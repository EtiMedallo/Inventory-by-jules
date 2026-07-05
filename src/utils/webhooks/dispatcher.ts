import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function dispatchWebhookEvent(organizationId: string, eventType: string, payload: Record<string, unknown>) {
    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find active webhooks for this org that subscribe to this event
    const { data: webhooks, error } = await adminSupabase
        .from('webhooks')
        .select('id, url, secret, events')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

    if (error || !webhooks || webhooks.length === 0) return;

    for (const webhook of webhooks) {
        if (!webhook.events.includes(eventType) && !webhook.events.includes('*')) continue;

        const deliveryRecord = {
            webhook_id: webhook.id,
            event_type: eventType,
            payload: payload,
            started_at: new Date().toISOString()
        };

        const { data: delivery, error: insertError } = await adminSupabase
            .from('webhook_deliveries')
            .insert(deliveryRecord)
            .select('id')
            .single();

        if (insertError) continue;

        try {
            // Sign payload if secret exists
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'User-Agent': 'AyP-Inventory-Webhook/1.0',
                'X-AyP-Event': eventType
            };

            const bodyString = JSON.stringify(payload);

            if (webhook.secret) {
                const signature = crypto.createHmac('sha256', webhook.secret).update(bodyString).digest('hex');
                headers['X-AyP-Signature'] = `sha256=${signature}`;
            }

            const response = await fetch(webhook.url, {
                method: 'POST',
                headers,
                body: bodyString,
                // Short timeout so we don't hang server routes
                signal: AbortSignal.timeout(5000)
            });

            const responseBodyText = await response.text();

            await adminSupabase.from('webhook_deliveries').update({
                response_status: response.status,
                response_body: responseBodyText.substring(0, 1000), // truncate long responses
                completed_at: new Date().toISOString(),
                success: response.ok
            }).eq('id', delivery.id);

        } catch (e: unknown) {
            await adminSupabase.from('webhook_deliveries').update({
                completed_at: new Date().toISOString(),
                success: false,
                error_message: (e as Error).message
            }).eq('id', delivery.id);
        }
    }
}
