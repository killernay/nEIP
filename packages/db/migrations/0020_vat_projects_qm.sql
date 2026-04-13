-- Migration 0020 — VAT Categories, Project System, Quality Management
-- Tasks: VAT Exempt/Zero-Rated/Mixed, Project System (PS), Quality Management (QM)

-- =========================================================================
-- TASK 3: VAT Exempt / Zero-Rated / Mixed
-- =========================================================================

-- Add vat_category to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS vat_category TEXT DEFAULT 'standard' CHECK (vat_category IN ('standard','exempt','zero_rated','out_of_scope'));

-- Add vat_code to invoice line items
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS vat_code TEXT DEFAULT 'V7' CHECK (vat_code IN ('V7','V0','VX','VO'));
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS vat_amount_satang BIGINT DEFAULT 0;

-- Add vat_code to bill line items
ALTER TABLE bill_line_items ADD COLUMN IF NOT EXISTS vat_code TEXT DEFAULT 'V7' CHECK (vat_code IN ('V7','V0','VX','VO'));
ALTER TABLE bill_line_items ADD COLUMN IF NOT EXISTS vat_recoverable BOOLEAN DEFAULT TRUE;

-- =========================================================================
-- TASK 4: Project System (PS)
-- =========================================================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL,
  name_th TEXT NOT NULL,
  name_en TEXT,
  customer_id TEXT REFERENCES contacts(id),
  project_type TEXT NOT NULL DEFAULT 'fixed_price' CHECK (project_type IN ('fixed_price','time_material','retainer','internal')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','on_hold','completed','closed','cancelled')),
  budget_satang BIGINT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  manager_id TEXT REFERENCES employees(id),
  cost_center_id TEXT REFERENCES cost_centers(id),
  notes TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, tenant_id)
);

CREATE TABLE IF NOT EXISTS project_phases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_satang BIGINT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  completion_percent INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  sort_order INTEGER DEFAULT 0,
  tenant_id TEXT NOT NULL REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id),
  phase_id TEXT REFERENCES project_phases(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  entry_date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  rate_satang BIGINT NOT NULL,
  amount_satang BIGINT NOT NULL,
  description TEXT,
  billable BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','billed')),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id),
  phase_id TEXT REFERENCES project_phases(id),
  description TEXT NOT NULL,
  amount_satang BIGINT NOT NULL,
  expense_date DATE NOT NULL,
  receipt_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','billed')),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- TASK 5: Quality Management (QM)
-- =========================================================================

CREATE TABLE IF NOT EXISTS quality_inspections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('incoming','in_process','final','periodic')),
  reference_type TEXT CHECK (reference_type IN ('purchase_order','production_order','stock_movement')),
  reference_id TEXT,
  product_id TEXT REFERENCES products(id),
  batch_id TEXT REFERENCES batches(id),
  inspector_id TEXT REFERENCES employees(id),
  inspection_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','passed','failed','conditional')),
  notes TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inspection_id TEXT NOT NULL REFERENCES quality_inspections(id) ON DELETE CASCADE,
  characteristic_name TEXT NOT NULL,
  specification TEXT,
  lower_limit NUMERIC,
  upper_limit NUMERIC,
  actual_value NUMERIC,
  result TEXT CHECK (result IN ('pass','fail','conditional')),
  notes TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS compliance_certificates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cert_type TEXT NOT NULL CHECK (cert_type IN ('gmp','haccp','halal','iso9001','iso14001','iso22000','fda','boi','iatf16949','rohs')),
  certificate_number TEXT NOT NULL,
  issuer TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked','pending_renewal')),
  notes TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(certificate_number, tenant_id)
);

CREATE TABLE IF NOT EXISTS boi_promotions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  certificate_number TEXT NOT NULL,
  promotion_type TEXT NOT NULL,
  corporate_tax_exempt_years INTEGER DEFAULT 0,
  corporate_tax_reduction_years INTEGER DEFAULT 0,
  import_duty_exempt BOOLEAN DEFAULT FALSE,
  machine_import_exempt BOOLEAN DEFAULT FALSE,
  conditions TEXT,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  status TEXT DEFAULT 'active',
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(certificate_number, tenant_id)
);
