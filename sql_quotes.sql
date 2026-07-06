-- DISCOUNT RULES
CREATE TABLE discount_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    min_down_payment_percent DECIMAL(5, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QUOTATIONS
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

    human_readable_code VARCHAR(50) UNIQUE NOT NULL,

    base_price DECIMAL(15, 2) NOT NULL,
    discount_applied_percent DECIMAL(5, 2) DEFAULT 0,
    final_price DECIMAL(15, 2) NOT NULL,

    down_payment_percent DECIMAL(5, 2) NOT NULL,
    down_payment_amount DECIMAL(15, 2) NOT NULL,

    financed_amount DECIMAL(15, 2) NOT NULL,
    term_months INTEGER NOT NULL,
    monthly_installment DECIMAL(15, 2) NOT NULL,

    status VARCHAR(50) DEFAULT 'draft',
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see discount rules in their org" ON discount_rules
  FOR ALL USING (
    EXISTS(SELECT 1 FROM projects WHERE projects.id = discount_rules.project_id AND (projects.organization_id = current_user_org() OR is_super_admin()))
  );
CREATE POLICY "Public read discount rules if project is public" ON discount_rules
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM projects WHERE projects.id = discount_rules.project_id AND projects.is_public = true)
  );

CREATE POLICY "Users see quotes in their org" ON quotations
  FOR ALL USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Public read specific quote" ON quotations
  FOR SELECT USING (true); -- Usually quotes are shared via unguessable links (the ID or code)
