-- ============================================================
-- Migration: 0022_pm_services_copa_atp
-- Description: Plant Maintenance, Service Procurement,
--              CO-PA Profitability Analysis, Available-to-Promise
-- Created:   2026-04-13
-- ============================================================

-- =========================================================================
-- 1. Plant Maintenance (PM) — Equipment, Maintenance Plans & Orders
-- =========================================================================

CREATE TABLE IF NOT EXISTS "equipment" (
  "id"              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"            TEXT NOT NULL,
  "name_th"         TEXT NOT NULL,
  "name_en"         TEXT,
  "equipment_type"  TEXT CHECK ("equipment_type" IN ('machine','vehicle','building','tool','it_equipment','other')),
  "manufacturer"    TEXT,
  "model"           TEXT,
  "serial_number"   TEXT,
  "location"        TEXT,
  "department_id"   TEXT REFERENCES "departments"("id"),
  "fixed_asset_id"  TEXT REFERENCES "fixed_assets"("id"),
  "status"          TEXT NOT NULL DEFAULT 'active'
    CHECK ("status" IN ('active','inactive','under_repair','disposed')),
  "purchase_date"   DATE,
  "warranty_end"    DATE,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("code", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_equipment_tenant" ON "equipment" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_equipment_status" ON "equipment" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_equipment_dept"   ON "equipment" ("tenant_id", "department_id");

CREATE OR REPLACE FUNCTION update_equipment_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_equipment_updated_at ON "equipment";
CREATE TRIGGER trg_equipment_updated_at BEFORE UPDATE ON "equipment"
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

ALTER TABLE "equipment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_tenant_isolation" ON "equipment";
CREATE POLICY "equipment_tenant_isolation" ON "equipment"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- Maintenance Plans
CREATE TABLE IF NOT EXISTS "maintenance_plans" (
  "id"              TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "equipment_id"    TEXT NOT NULL REFERENCES "equipment"("id"),
  "plan_type"       TEXT NOT NULL CHECK ("plan_type" IN ('preventive_time','preventive_counter','condition_based')),
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "frequency_days"  INTEGER,
  "frequency_hours" INTEGER,
  "last_executed_at" TIMESTAMPTZ,
  "next_due_at"     TIMESTAMPTZ,
  "is_active"       BOOLEAN NOT NULL DEFAULT TRUE,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_maint_plans_tenant" ON "maintenance_plans" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_maint_plans_equip" ON "maintenance_plans" ("equipment_id");
CREATE INDEX IF NOT EXISTS "idx_maint_plans_due"   ON "maintenance_plans" ("tenant_id", "next_due_at") WHERE "is_active" = TRUE;

ALTER TABLE "maintenance_plans" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_plans_tenant_isolation" ON "maintenance_plans";
CREATE POLICY "maintenance_plans_tenant_isolation" ON "maintenance_plans"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- Maintenance Orders
CREATE TABLE IF NOT EXISTS "maintenance_orders" (
  "id"                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_number"     TEXT NOT NULL,
  "equipment_id"        TEXT NOT NULL REFERENCES "equipment"("id"),
  "maintenance_plan_id" TEXT REFERENCES "maintenance_plans"("id"),
  "order_type"          TEXT NOT NULL CHECK ("order_type" IN ('preventive','corrective','emergency')),
  "priority"            TEXT NOT NULL DEFAULT 'medium' CHECK ("priority" IN ('low','medium','high','emergency')),
  "status"              TEXT NOT NULL DEFAULT 'planned'
    CHECK ("status" IN ('planned','released','in_progress','completed','closed','cancelled')),
  "description"         TEXT,
  "failure_description" TEXT,
  "assigned_to"         TEXT REFERENCES "employees"("id"),
  "planned_start"       TIMESTAMPTZ,
  "planned_end"         TIMESTAMPTZ,
  "actual_start"        TIMESTAMPTZ,
  "actual_end"          TIMESTAMPTZ,
  "labor_hours"         NUMERIC(10,2) DEFAULT 0,
  "material_cost_satang" BIGINT DEFAULT 0,
  "labor_cost_satang"   BIGINT DEFAULT 0,
  "total_cost_satang"   BIGINT DEFAULT 0,
  "downtime_hours"      NUMERIC(10,2) DEFAULT 0,
  "tenant_id"           TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"          TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_maint_orders_tenant" ON "maintenance_orders" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_maint_orders_equip"  ON "maintenance_orders" ("tenant_id", "equipment_id");
CREATE INDEX IF NOT EXISTS "idx_maint_orders_status" ON "maintenance_orders" ("tenant_id", "status");

CREATE OR REPLACE FUNCTION update_maintenance_orders_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_maintenance_orders_updated_at ON "maintenance_orders";
CREATE TRIGGER trg_maintenance_orders_updated_at BEFORE UPDATE ON "maintenance_orders"
  FOR EACH ROW EXECUTE FUNCTION update_maintenance_orders_updated_at();

ALTER TABLE "maintenance_orders" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_orders_tenant_isolation" ON "maintenance_orders";
CREATE POLICY "maintenance_orders_tenant_isolation" ON "maintenance_orders"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- Maintenance Order Parts
CREATE TABLE IF NOT EXISTS "maintenance_order_parts" (
  "id"                    TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "maintenance_order_id"  TEXT NOT NULL REFERENCES "maintenance_orders"("id") ON DELETE CASCADE,
  "product_id"            TEXT REFERENCES "products"("id"),
  "description"           TEXT,
  "quantity"              NUMERIC(10,2) NOT NULL,
  "unit_cost_satang"      BIGINT DEFAULT 0,
  "total_cost_satang"     BIGINT DEFAULT 0,
  "issued"                BOOLEAN NOT NULL DEFAULT FALSE,
  "tenant_id"             TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_maint_parts_order" ON "maintenance_order_parts" ("maintenance_order_id");
CREATE INDEX IF NOT EXISTS "idx_maint_parts_tenant" ON "maintenance_order_parts" ("tenant_id");

ALTER TABLE "maintenance_order_parts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_order_parts_tenant_isolation" ON "maintenance_order_parts";
CREATE POLICY "maintenance_order_parts_tenant_isolation" ON "maintenance_order_parts"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 2. Service Procurement — Service Entry Sheets
-- =========================================================================

CREATE TABLE IF NOT EXISTS "service_entry_sheets" (
  "id"                  TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_number"     TEXT NOT NULL,
  "purchase_order_id"   TEXT REFERENCES "purchase_orders"("id"),
  "vendor_id"           TEXT NOT NULL REFERENCES "vendors"("id"),
  "service_description" TEXT NOT NULL,
  "service_date"        DATE NOT NULL,
  "amount_satang"       BIGINT NOT NULL,
  "status"              TEXT NOT NULL DEFAULT 'draft'
    CHECK ("status" IN ('draft','submitted','approved','rejected','billed')),
  "approved_by"         TEXT,
  "approved_at"         TIMESTAMPTZ,
  "bill_id"             TEXT REFERENCES "bills"("id"),
  "tenant_id"           TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"          TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_ses_tenant"  ON "service_entry_sheets" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_ses_status"  ON "service_entry_sheets" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_ses_vendor"  ON "service_entry_sheets" ("tenant_id", "vendor_id");
CREATE INDEX IF NOT EXISTS "idx_ses_po"      ON "service_entry_sheets" ("purchase_order_id");

ALTER TABLE "service_entry_sheets" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_entry_sheets_tenant_isolation" ON "service_entry_sheets";
CREATE POLICY "service_entry_sheets_tenant_isolation" ON "service_entry_sheets"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 3. Sales Orders — add atp_status column for Available-to-Promise
-- =========================================================================

ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "atp_status" TEXT DEFAULT 'unknown'
  CHECK ("atp_status" IN ('available','partial','unavailable','unknown'));

-- =========================================================================
-- 4. Permissions
-- =========================================================================

INSERT INTO permissions (id, name, description) VALUES
  -- Plant Maintenance
  ('pm:equipment:create',  'pm:equipment:create',  'Create equipment'),
  ('pm:equipment:read',    'pm:equipment:read',    'View equipment'),
  ('pm:equipment:update',  'pm:equipment:update',  'Update equipment'),
  ('pm:plan:create',       'pm:plan:create',       'Create maintenance plans'),
  ('pm:plan:read',         'pm:plan:read',         'View maintenance plans'),
  ('pm:plan:update',       'pm:plan:update',       'Update maintenance plans'),
  ('pm:order:create',      'pm:order:create',      'Create maintenance orders'),
  ('pm:order:read',        'pm:order:read',        'View maintenance orders'),
  ('pm:order:update',      'pm:order:update',      'Update maintenance orders'),
  ('pm:order:close',       'pm:order:close',       'Close maintenance orders'),
  -- Service Procurement
  ('ap:service:create',    'ap:service:create',    'Create service entry sheets'),
  ('ap:service:read',      'ap:service:read',      'View service entry sheets'),
  ('ap:service:update',    'ap:service:update',    'Update service entry sheets'),
  ('ap:service:approve',   'ap:service:approve',   'Approve service entry sheets'),
  -- CO-PA Profitability
  ('report:profitability:read', 'report:profitability:read', 'View profitability analysis'),
  -- ATP
  ('inventory:atp:read',   'inventory:atp:read',   'Check available-to-promise')
ON CONFLICT (id) DO NOTHING;
