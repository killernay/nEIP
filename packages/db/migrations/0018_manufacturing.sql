-- Manufacturing (PP) Module — BOM, Work Centers, Production Orders, Confirmations
-- Migration 0018

-- BOM Headers
CREATE TABLE IF NOT EXISTS bom_headers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL REFERENCES products(id),
  version INTEGER NOT NULL DEFAULT 1,
  name_th TEXT,
  name_en TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','obsolete')),
  valid_from DATE,
  valid_to DATE,
  notes TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOM Lines (components)
CREATE TABLE IF NOT EXISTS bom_lines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bom_id TEXT NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
  component_product_id TEXT NOT NULL REFERENCES products(id),
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'EA',
  scrap_percent NUMERIC(5,2) DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Centers
CREATE TABLE IF NOT EXISTS work_centers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL,
  name_th TEXT NOT NULL,
  name_en TEXT,
  capacity_per_hour NUMERIC(10,2) DEFAULT 1,
  cost_rate_satang BIGINT DEFAULT 0,
  department_id TEXT REFERENCES departments(id),
  is_active BOOLEAN DEFAULT TRUE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, tenant_id)
);

-- Production Orders
CREATE TABLE IF NOT EXISTS production_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_number TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  bom_id TEXT NOT NULL REFERENCES bom_headers(id),
  planned_quantity NUMERIC(18,4) NOT NULL,
  completed_quantity NUMERIC(18,4) DEFAULT 0,
  scrap_quantity NUMERIC(18,4) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','released','in_progress','completed','closed','cancelled')),
  planned_start DATE,
  planned_end DATE,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  work_center_id TEXT REFERENCES work_centers(id),
  warehouse_id TEXT REFERENCES warehouses(id),
  notes TEXT,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production Order Components (exploded from BOM)
CREATE TABLE IF NOT EXISTS production_order_components (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  component_product_id TEXT NOT NULL REFERENCES products(id),
  required_quantity NUMERIC(18,4) NOT NULL,
  issued_quantity NUMERIC(18,4) DEFAULT 0,
  scrap_quantity NUMERIC(18,4) DEFAULT 0,
  warehouse_id TEXT REFERENCES warehouses(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production Confirmations
CREATE TABLE IF NOT EXISTS production_confirmations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  production_order_id TEXT NOT NULL REFERENCES production_orders(id),
  confirmed_quantity NUMERIC(18,4) NOT NULL,
  scrap_quantity NUMERIC(18,4) DEFAULT 0,
  labor_hours NUMERIC(10,2) DEFAULT 0,
  machine_hours NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bom_product ON bom_headers(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_tenant ON bom_headers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_bom ON bom_lines(bom_id);
CREATE INDEX IF NOT EXISTS idx_prod_order_product ON production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_prod_order_tenant ON production_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prod_order_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_prod_components_order ON production_order_components(production_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_confirm_order ON production_confirmations(production_order_id);
