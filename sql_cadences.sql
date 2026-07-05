-- SALES CADENCES
CREATE TABLE sales_cadences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL DEFAULT 1,
    action_type VARCHAR(50) NOT NULL, -- e.g., 'call', 'whatsapp', 'email'
    template_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LEAD TASKS
CREATE TABLE lead_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    template_text TEXT,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, overdue, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LEAD TASK LOGS
CREATE TABLE lead_task_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES lead_tasks(id) ON DELETE CASCADE,
    result VARCHAR(100) NOT NULL, -- no_answer, interested, appointment_set, not_interested, etc.
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE sales_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_task_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see cadences in their org" ON sales_cadences FOR ALL USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Users see tasks in their org" ON lead_tasks FOR ALL USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Users see task logs in their org" ON lead_task_logs FOR ALL USING (EXISTS(SELECT 1 FROM lead_tasks WHERE lead_tasks.id = lead_task_logs.task_id AND (lead_tasks.organization_id = current_user_org() OR is_super_admin())));
