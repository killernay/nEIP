-- Enterprise Structure Migration
-- Run: psql postgresql://neip:neip@localhost:5434/neip -f migrations/enterprise-structure.sql

-- Enhance companies table with enterprise fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'subsidiary' CHECK (company_type IN ('holding','subsidiary','branch','division'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_th TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_en TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_year_start INTEGER DEFAULT 1;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'THB';

-- Branches / Plants (physical locations under a company)
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL,
  name_th TEXT NOT NULL,
  name_en TEXT,
  company_id TEXT REFERENCES companies(id),
  branch_type TEXT DEFAULT 'office' CHECK (branch_type IN ('headquarters','office','factory','warehouse','retail_store','service_center')),
  address_th TEXT,
  address_en TEXT,
  phone TEXT,
  manager_id TEXT REFERENCES employees(id),
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id);

-- Sales channels (how you sell)
CREATE TABLE IF NOT EXISTS sales_channels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL,
  name_th TEXT NOT NULL,
  name_en TEXT,
  channel_type TEXT DEFAULT 'direct' CHECK (channel_type IN ('direct','retail','wholesale','online','distributor','agent')),
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, tenant_id)
);

-- Link warehouses to branches
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id);

-- Link cost centers to branches
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id);

-- Link departments to branches
ALTER TABLE departments ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES branches(id);
