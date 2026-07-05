-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 8 chars for display
  environment TEXT NOT NULL DEFAULT 'production', -- 'production' or 'sandbox'
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS for api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_org_admin_all" ON api_keys
  FOR ALL TO authenticated
  USING (organization_id = current_user_org() AND is_org_admin())
  WITH CHECK (organization_id = current_user_org() AND is_org_admin());

-- Create webhooks table (Outgoing webhooks configuration)
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT, -- For HMAC signing
  events TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['lead.created', 'lot.sold']
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS for webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhooks_org_admin_all" ON webhooks
  FOR ALL TO authenticated
  USING (organization_id = current_user_org() AND is_org_admin())
  WITH CHECK (organization_id = current_user_org() AND is_org_admin());

-- Create webhook_deliveries table (Logs for outgoing webhooks)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT
);

-- RLS for webhook_deliveries
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_deliveries_org_admin_read" ON webhook_deliveries
  FOR SELECT TO authenticated
  USING (
     EXISTS (
        SELECT 1 FROM webhooks w
        WHERE w.id = webhook_id
        AND w.organization_id = current_user_org()
        AND is_org_admin()
     )
  );

-- Create a generic integration_logs table (useful for Kommo/Pipedrive tracking later)
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'kommo', 'pipedrive'
  action TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'error'
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for integration_logs
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_logs_org_admin_read" ON integration_logs
  FOR SELECT TO authenticated
  USING (organization_id = current_user_org() AND is_org_admin());
