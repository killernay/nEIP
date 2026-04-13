-- ============================================================
-- Migration: 0026_mm_pp_gaps
-- Description: MM + PP HIGH gap closure — Outline Agreements,
--   Scheduling Agreements, STO, Source List, Consignment,
--   Special Stocks, CRP, Kanban, Process Orders, Co-Products,
--   Engineering Change Management, Demand Management
-- Created: 2026-04-13
-- ============================================================

-- =========================================================================
-- 1. Purchasing Contracts (Outline Agreements — SAP ME31K/ME32K)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "purchasing_contracts" (
  "id"                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_number"        TEXT NOT NULL,
  "vendor_id"              TEXT NOT NULL REFERENCES "vendors"("id"),
  "contract_type"          TEXT NOT NULL CHECK ("contract_type" IN ('quantity','value')),
  "target_quantity"        NUMERIC(18,4),
  "target_value_satang"    BIGINT,
  "released_quantity"      NUMERIC(18,4) NOT NULL DEFAULT 0,
  "released_value_satang"  BIGINT NOT NULL DEFAULT 0,
  "valid_from"             DATE NOT NULL,
  "valid_to"               DATE NOT NULL,
  "status"                 TEXT NOT NULL DEFAULT 'active'
    CHECK ("status" IN ('active','completed','cancelled')),
  "payment_terms_id"       TEXT REFERENCES "payment_terms"("id"),
  "notes"                  TEXT,
  "tenant_id"              TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"             TEXT,
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("document_number", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_purchasing_contracts_tenant_status"
  ON "purchasing_contracts" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_purchasing_contracts_vendor"
  ON "purchasing_contracts" ("tenant_id", "vendor_id");

ALTER TABLE "purchasing_contracts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchasing_contracts_tenant_isolation" ON "purchasing_contracts";
CREATE POLICY "purchasing_contracts_tenant_isolation" ON "purchasing_contracts"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

CREATE TABLE IF NOT EXISTS "purchasing_contract_lines" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "contract_id"       TEXT NOT NULL REFERENCES "purchasing_contracts"("id") ON DELETE CASCADE,
  "product_id"        TEXT NOT NULL REFERENCES "products"("id"),
  "unit_price_satang" BIGINT NOT NULL DEFAULT 0,
  "target_quantity"   NUMERIC(18,4) NOT NULL DEFAULT 0,
  "released_quantity" NUMERIC(18,4) NOT NULL DEFAULT 0,
  "tenant_id"         TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_pcl_contract"
  ON "purchasing_contract_lines" ("contract_id");

ALTER TABLE "purchasing_contract_lines" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pcl_tenant_isolation" ON "purchasing_contract_lines";
CREATE POLICY "pcl_tenant_isolation" ON "purchasing_contract_lines"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 2. Scheduling Agreements (SAP ME31L)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "scheduling_agreements" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_number"  TEXT NOT NULL,
  "vendor_id"        TEXT NOT NULL REFERENCES "vendors"("id"),
  "product_id"       TEXT NOT NULL REFERENCES "products"("id"),
  "total_quantity"   NUMERIC(18,4) NOT NULL DEFAULT 0,
  "delivered_quantity" NUMERIC(18,4) NOT NULL DEFAULT 0,
  "schedule"         JSONB NOT NULL DEFAULT '[]',
  "status"           TEXT NOT NULL DEFAULT 'active'
    CHECK ("status" IN ('active','completed','cancelled')),
  "valid_from"       DATE,
  "valid_to"         DATE,
  "notes"            TEXT,
  "tenant_id"        TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"       TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("document_number", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_sched_agreements_tenant"
  ON "scheduling_agreements" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_sched_agreements_vendor"
  ON "scheduling_agreements" ("tenant_id", "vendor_id");

ALTER TABLE "scheduling_agreements" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scheduling_agreements_tenant_isolation" ON "scheduling_agreements";
CREATE POLICY "scheduling_agreements_tenant_isolation" ON "scheduling_agreements"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 3. Stock Transport Orders (STO)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "stock_transport_orders" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_number" TEXT NOT NULL,
  "from_branch_id"  TEXT NOT NULL REFERENCES "branches"("id"),
  "to_branch_id"    TEXT NOT NULL REFERENCES "branches"("id"),
  "from_warehouse_id" TEXT REFERENCES "warehouses"("id"),
  "to_warehouse_id"   TEXT REFERENCES "warehouses"("id"),
  "status"          TEXT NOT NULL DEFAULT 'created'
    CHECK ("status" IN ('created','shipped','in_transit','received','cancelled')),
  "shipped_at"      TIMESTAMPTZ,
  "received_at"     TIMESTAMPTZ,
  "notes"           TEXT,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"      TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("document_number", "tenant_id")
);

CREATE TABLE IF NOT EXISTS "stock_transport_order_lines" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sto_id"          TEXT NOT NULL REFERENCES "stock_transport_orders"("id") ON DELETE CASCADE,
  "product_id"      TEXT NOT NULL REFERENCES "products"("id"),
  "quantity"        NUMERIC(18,4) NOT NULL,
  "received_quantity" NUMERIC(18,4) NOT NULL DEFAULT 0,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sto_tenant_status"
  ON "stock_transport_orders" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_sto_lines_sto"
  ON "stock_transport_order_lines" ("sto_id");

ALTER TABLE "stock_transport_orders" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sto_tenant_isolation" ON "stock_transport_orders";
CREATE POLICY "sto_tenant_isolation" ON "stock_transport_orders"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

ALTER TABLE "stock_transport_order_lines" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sto_lines_tenant_isolation" ON "stock_transport_order_lines";
CREATE POLICY "sto_lines_tenant_isolation" ON "stock_transport_order_lines"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 4. Source List
-- =========================================================================

CREATE TABLE IF NOT EXISTS "source_list" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "product_id"    TEXT NOT NULL REFERENCES "products"("id"),
  "vendor_id"     TEXT NOT NULL REFERENCES "vendors"("id"),
  "valid_from"    DATE NOT NULL,
  "valid_to"      DATE NOT NULL,
  "is_preferred"  BOOLEAN NOT NULL DEFAULT FALSE,
  "contract_id"   TEXT REFERENCES "purchasing_contracts"("id"),
  "notes"         TEXT,
  "tenant_id"     TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_source_list_product"
  ON "source_list" ("tenant_id", "product_id");
CREATE INDEX IF NOT EXISTS "idx_source_list_vendor"
  ON "source_list" ("tenant_id", "vendor_id");

ALTER TABLE "source_list" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "source_list_tenant_isolation" ON "source_list";
CREATE POLICY "source_list_tenant_isolation" ON "source_list"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 5. Consignment Stock
-- =========================================================================

CREATE TABLE IF NOT EXISTS "consignment_stock" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vendor_id"     TEXT NOT NULL REFERENCES "vendors"("id"),
  "product_id"    TEXT NOT NULL REFERENCES "products"("id"),
  "warehouse_id"  TEXT NOT NULL REFERENCES "warehouses"("id"),
  "quantity"       NUMERIC(18,4) NOT NULL DEFAULT 0,
  "consumed_quantity" NUMERIC(18,4) NOT NULL DEFAULT 0,
  "status"        TEXT NOT NULL DEFAULT 'available'
    CHECK ("status" IN ('available','consumed','returned')),
  "notes"         TEXT,
  "tenant_id"     TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"    TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_consignment_stock_tenant"
  ON "consignment_stock" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_consignment_stock_vendor"
  ON "consignment_stock" ("tenant_id", "vendor_id");

ALTER TABLE "consignment_stock" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consignment_stock_tenant_isolation" ON "consignment_stock";
CREATE POLICY "consignment_stock_tenant_isolation" ON "consignment_stock"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 6. Special Stocks — Add stock_type to stock_movements & create stock_levels_by_type view
-- =========================================================================

ALTER TABLE "stock_movements"
  ADD COLUMN IF NOT EXISTS "stock_type" TEXT NOT NULL DEFAULT 'unrestricted'
    CHECK ("stock_type" IN ('unrestricted','project','sales_order','consignment'));

-- =========================================================================
-- 7. Kanban Cards (PP-KAN)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "kanban_cards" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "card_number"     TEXT NOT NULL,
  "product_id"      TEXT NOT NULL REFERENCES "products"("id"),
  "source_supply"   TEXT NOT NULL CHECK ("source_supply" IN ('production','purchasing','transfer')),
  "quantity"        NUMERIC(18,4) NOT NULL,
  "work_center_id"  TEXT REFERENCES "work_centers"("id"),
  "warehouse_id"    TEXT REFERENCES "warehouses"("id"),
  "status"          TEXT NOT NULL DEFAULT 'empty'
    CHECK ("status" IN ('empty','in_process','full')),
  "last_triggered_at" TIMESTAMPTZ,
  "notes"           TEXT,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("card_number", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_kanban_cards_tenant"
  ON "kanban_cards" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_kanban_cards_product"
  ON "kanban_cards" ("tenant_id", "product_id");

ALTER TABLE "kanban_cards" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kanban_cards_tenant_isolation" ON "kanban_cards";
CREATE POLICY "kanban_cards_tenant_isolation" ON "kanban_cards"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 8. Process Orders (PP-PI — recipe-based manufacturing)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "process_orders" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "document_number"  TEXT NOT NULL,
  "product_id"       TEXT NOT NULL REFERENCES "products"("id"),
  "recipe_id"        TEXT REFERENCES "bom_headers"("id"),
  "batch_id"         TEXT REFERENCES "batches"("id"),
  "planned_quantity" NUMERIC(18,4) NOT NULL,
  "actual_quantity"  NUMERIC(18,4) NOT NULL DEFAULT 0,
  "status"           TEXT NOT NULL DEFAULT 'planned'
    CHECK ("status" IN ('planned','released','in_progress','completed','closed','cancelled')),
  "planned_start"    DATE,
  "planned_end"      DATE,
  "actual_start"     TIMESTAMPTZ,
  "actual_end"       TIMESTAMPTZ,
  "work_center_id"   TEXT REFERENCES "work_centers"("id"),
  "warehouse_id"     TEXT REFERENCES "warehouses"("id"),
  "notes"            TEXT,
  "tenant_id"        TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"       TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("document_number", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_process_orders_tenant"
  ON "process_orders" ("tenant_id", "status");

ALTER TABLE "process_orders" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "process_orders_tenant_isolation" ON "process_orders";
CREATE POLICY "process_orders_tenant_isolation" ON "process_orders"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 9. Production Outputs — Co-Products / By-Products
-- =========================================================================

CREATE TABLE IF NOT EXISTS "production_outputs" (
  "id"                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "production_order_id"    TEXT NOT NULL REFERENCES "production_orders"("id") ON DELETE CASCADE,
  "product_id"             TEXT NOT NULL REFERENCES "products"("id"),
  "output_type"            TEXT NOT NULL DEFAULT 'main'
    CHECK ("output_type" IN ('main','co_product','by_product')),
  "planned_quantity"       NUMERIC(18,4) NOT NULL DEFAULT 0,
  "actual_quantity"        NUMERIC(18,4) NOT NULL DEFAULT 0,
  "cost_allocation_percent" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "warehouse_id"           TEXT REFERENCES "warehouses"("id"),
  "tenant_id"              TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_production_outputs_order"
  ON "production_outputs" ("production_order_id");

ALTER TABLE "production_outputs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_outputs_tenant_isolation" ON "production_outputs";
CREATE POLICY "production_outputs_tenant_isolation" ON "production_outputs"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 10. Engineering Change Management (PP-ECM)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "engineering_changes" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "change_number"   TEXT NOT NULL,
  "bom_id"          TEXT NOT NULL REFERENCES "bom_headers"("id"),
  "change_type"     TEXT NOT NULL CHECK ("change_type" IN ('add','remove','modify')),
  "description"     TEXT NOT NULL,
  "reason"          TEXT,
  "effective_date"  DATE NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'proposed'
    CHECK ("status" IN ('proposed','approved','rejected','implemented')),
  "approved_by"     TEXT,
  "approved_at"     TIMESTAMPTZ,
  "implemented_at"  TIMESTAMPTZ,
  "change_details"  JSONB,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"      TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("change_number", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_engineering_changes_tenant"
  ON "engineering_changes" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_engineering_changes_bom"
  ON "engineering_changes" ("bom_id");

ALTER TABLE "engineering_changes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "engineering_changes_tenant_isolation" ON "engineering_changes";
CREATE POLICY "engineering_changes_tenant_isolation" ON "engineering_changes"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 11. Planned Independent Requirements (Demand Management)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "planned_independent_requirements" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "product_id"       TEXT NOT NULL REFERENCES "products"("id"),
  "period_date"      DATE NOT NULL,
  "planned_quantity" NUMERIC(18,4) NOT NULL DEFAULT 0,
  "actual_quantity"  NUMERIC(18,4) NOT NULL DEFAULT 0,
  "source"           TEXT NOT NULL DEFAULT 'manual'
    CHECK ("source" IN ('forecast','manual','ai_prediction')),
  "version"          INTEGER NOT NULL DEFAULT 1,
  "notes"            TEXT,
  "tenant_id"        TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"       TEXT,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_pir_tenant_product"
  ON "planned_independent_requirements" ("tenant_id", "product_id");
CREATE INDEX IF NOT EXISTS "idx_pir_period"
  ON "planned_independent_requirements" ("tenant_id", "period_date");

ALTER TABLE "planned_independent_requirements" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pir_tenant_isolation" ON "planned_independent_requirements";
CREATE POLICY "pir_tenant_isolation" ON "planned_independent_requirements"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- =========================================================================
-- 12. Permissions for all new modules
-- =========================================================================

INSERT INTO permissions (id, name, description) VALUES
  -- MM: Purchasing Contracts
  ('mm:contract:create',   'mm:contract:create',   'Create purchasing contracts'),
  ('mm:contract:read',     'mm:contract:read',     'View purchasing contracts'),
  ('mm:contract:update',   'mm:contract:update',   'Update purchasing contracts'),
  ('mm:contract:release',  'mm:contract:release',  'Release PO from contract'),
  -- MM: Scheduling Agreements
  ('mm:sched-agreement:create', 'mm:sched-agreement:create', 'Create scheduling agreements'),
  ('mm:sched-agreement:read',   'mm:sched-agreement:read',   'View scheduling agreements'),
  ('mm:sched-agreement:update', 'mm:sched-agreement:update', 'Update scheduling agreements'),
  -- MM: Stock Transport Orders
  ('mm:sto:create',  'mm:sto:create',  'Create stock transport orders'),
  ('mm:sto:read',    'mm:sto:read',    'View stock transport orders'),
  ('mm:sto:update',  'mm:sto:update',  'Update stock transport orders'),
  -- MM: Source List
  ('mm:source-list:create', 'mm:source-list:create', 'Create source list entries'),
  ('mm:source-list:read',   'mm:source-list:read',   'View source list'),
  ('mm:source-list:update', 'mm:source-list:update', 'Update source list entries'),
  -- MM: Consignment Stock
  ('mm:consignment:create', 'mm:consignment:create', 'Receive consignment stock'),
  ('mm:consignment:read',   'mm:consignment:read',   'View consignment stock'),
  ('mm:consignment:update', 'mm:consignment:update', 'Consume/return consignment'),
  -- PP: Capacity Planning
  ('pp:capacity:read', 'pp:capacity:read', 'View capacity requirements'),
  -- PP: Kanban
  ('pp:kanban:create', 'pp:kanban:create', 'Create kanban cards'),
  ('pp:kanban:read',   'pp:kanban:read',   'View kanban cards'),
  ('pp:kanban:update', 'pp:kanban:update', 'Update kanban cards'),
  ('pp:kanban:trigger','pp:kanban:trigger','Trigger kanban replenishment'),
  -- PP: Process Orders
  ('pp:process-order:create', 'pp:process-order:create', 'Create process orders'),
  ('pp:process-order:read',   'pp:process-order:read',   'View process orders'),
  ('pp:process-order:update', 'pp:process-order:update', 'Update process orders'),
  -- PP: Co-Products / By-Products
  ('pp:output:create', 'pp:output:create', 'Create production outputs'),
  ('pp:output:read',   'pp:output:read',   'View production outputs'),
  ('pp:output:update', 'pp:output:update', 'Update production outputs'),
  -- PP: Engineering Change Management
  ('pp:ecm:create',     'pp:ecm:create',     'Create engineering changes'),
  ('pp:ecm:read',       'pp:ecm:read',       'View engineering changes'),
  ('pp:ecm:approve',    'pp:ecm:approve',    'Approve engineering changes'),
  ('pp:ecm:implement',  'pp:ecm:implement',  'Implement engineering changes'),
  -- PP: Demand Management
  ('pp:demand:create', 'pp:demand:create', 'Create planned independent requirements'),
  ('pp:demand:read',   'pp:demand:read',   'View planned independent requirements'),
  ('pp:demand:update', 'pp:demand:update', 'Update planned independent requirements')
ON CONFLICT (id) DO NOTHING;
