-- PIPELINE STAGES
CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT 'gray',
    stage_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LEAD TEMPERATURE ENUM
CREATE TYPE lead_temperature AS ENUM ('cold', 'warm', 'hot');

-- LEADS
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,

    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),

    source VARCHAR(100),
    temperature lead_temperature DEFAULT 'cold',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LEAD ACTIVITIES (Timeline)
CREATE TABLE lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

    activity_type VARCHAR(100) NOT NULL, -- e.g. 'form_submitted', 'lot_inquiry', 'like', 'stage_changed'
    description TEXT,
    metadata JSONB, -- useful for storing lot_id, quote_id, etc.

    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- nullable because system/public actions don't have a user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Policies for Pipeline Stages
CREATE POLICY "Users see stages in their org" ON pipeline_stages
  FOR SELECT USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Org admins manage stages" ON pipeline_stages
  FOR ALL USING ((organization_id = current_user_org() AND EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'org_admin')) OR is_super_admin());

-- Policies for Leads
CREATE POLICY "Users see leads in their org" ON leads
  FOR SELECT USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Users can create leads in their org" ON leads
  FOR INSERT WITH CHECK (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Users can update leads in their org" ON leads
  FOR UPDATE USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Public can insert leads into public projects" ON leads
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM projects WHERE projects.id = project_id AND projects.is_public = true)
  );

-- Policies for Lead Activities
CREATE POLICY "Users see activities in their org" ON lead_activities
  FOR SELECT USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Users can insert activities in their org" ON lead_activities
  FOR INSERT WITH CHECK (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Public can insert activities for public project leads" ON lead_activities
  FOR INSERT WITH CHECK (
    EXISTS(
      SELECT 1 FROM leads
      JOIN projects ON leads.project_id = projects.id
      WHERE leads.id = lead_activities.lead_id AND projects.is_public = true
    )
  );
