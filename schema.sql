-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES ENUM
CREATE TYPE app_role AS ENUM ('super_admin', 'org_admin', 'commercial');

-- ORGANIZATIONS
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROFILES (Users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role app_role DEFAULT 'commercial' NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    referral_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROJECTS
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    floor_plan_url TEXT,
    currency VARCHAR(10) DEFAULT 'COP',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LOT STATUS ENUM
CREATE TYPE lot_status AS ENUM ('available', 'reserved', 'sold', 'negotiation', 'social_zone');

-- LOTS
CREATE TABLE lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    identifier VARCHAR(100) NOT NULL,
    description TEXT,
    area_sqm DECIMAL(10, 2),
    price DECIMAL(15, 2),
    status lot_status DEFAULT 'available' NOT NULL,
    polygon_data JSONB, -- Coordinates for Fabric.js/SVG
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, identifier)
);

-- LOT MEDIA
CREATE TABLE lot_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(50) DEFAULT 'image',
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_media ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION current_user_org()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for Organizations
CREATE POLICY "Super admins see all orgs" ON organizations
  FOR ALL USING (is_super_admin());
CREATE POLICY "Users see their own org" ON organizations
  FOR SELECT USING (id = current_user_org());

-- Policies for Profiles
CREATE POLICY "Users see profiles in their org" ON profiles
  FOR SELECT USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Policies for Projects
CREATE POLICY "Users see projects in their org" ON projects
  FOR ALL USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Public projects are visible to all" ON projects
  FOR SELECT USING (is_public = true);

-- Policies for Lots
CREATE POLICY "Users see lots in their org" ON lots
  FOR ALL USING (organization_id = current_user_org() OR is_super_admin());
CREATE POLICY "Public lots are visible to all if project is public" ON lots
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM projects WHERE projects.id = lots.project_id AND projects.is_public = true)
  );

-- Policies for Lot Media
CREATE POLICY "Users see lot media in their org" ON lot_media
  FOR ALL USING (
    EXISTS(SELECT 1 FROM lots WHERE lots.id = lot_media.lot_id AND (lots.organization_id = current_user_org() OR is_super_admin()))
  );
CREATE POLICY "Public lot media is visible to all if project is public" ON lot_media
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM lots
      JOIN projects ON lots.project_id = projects.id
      WHERE lots.id = lot_media.lot_id AND projects.is_public = true
    )
  );

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('project-floor-plans', 'project-floor-plans', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lot-media', 'lot-media', true) ON CONFLICT DO NOTHING;
