-- ============================================================
-- Migration: 0027_ewm_ps_qm_gaps
-- Description: EWM (Extended Warehouse Management), PS (Project System)
--              enhancements, QM (Quality Management) enhancements
-- Created: 2026-04-13
-- ============================================================

-- =========================================================================
-- SECTION 1: EWM — Extended Warehouse Management
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 1.1 Storage Bins
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "storage_bins" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "warehouse_id"       TEXT NOT NULL REFERENCES "warehouses"("id") ON DELETE CASCADE,
  "bin_code"           TEXT NOT NULL,
  "zone"               TEXT,
  "aisle"              TEXT,
  "rack"               TEXT,
  "level"              TEXT,
  "bin_type"           TEXT NOT NULL DEFAULT 'standard'
    CHECK ("bin_type" IN ('standard','bulk','picking','receiving')),
  "max_weight_kg"      NUMERIC(12,2),
  "is_occupied"        BOOLEAN NOT NULL DEFAULT FALSE,
  "current_product_id" TEXT REFERENCES "products"("id"),
  "current_quantity"   NUMERIC(15,4) DEFAULT 0,
  "tenant_id"          TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("warehouse_id", "bin_code", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_storage_bins_warehouse"
  ON "storage_bins" ("tenant_id", "warehouse_id");

CREATE INDEX IF NOT EXISTS "idx_storage_bins_zone"
  ON "storage_bins" ("tenant_id", "warehouse_id", "zone");

ALTER TABLE "storage_bins" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_bins_tenant_isolation" ON "storage_bins";
CREATE POLICY "storage_bins_tenant_isolation"
  ON "storage_bins" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 1.2 Putaway Rules / Strategies
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "putaway_rules" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "warehouse_id" TEXT NOT NULL REFERENCES "warehouses"("id") ON DELETE CASCADE,
  "strategy"     TEXT NOT NULL DEFAULT 'nearest_empty'
    CHECK ("strategy" IN ('fixed_bin','nearest_empty','zone_based','product_group')),
  "priority"     INTEGER NOT NULL DEFAULT 10,
  "product_group" TEXT,
  "zone"          TEXT,
  "fixed_bin_id"  TEXT REFERENCES "storage_bins"("id"),
  "tenant_id"    TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_putaway_rules_warehouse"
  ON "putaway_rules" ("tenant_id", "warehouse_id");

ALTER TABLE "putaway_rules" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "putaway_rules_tenant_isolation" ON "putaway_rules";
CREATE POLICY "putaway_rules_tenant_isolation"
  ON "putaway_rules" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 1.3 Pick Lists (FEFO/FIFO picking strategies)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "pick_lists" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "delivery_note_id"  TEXT NOT NULL REFERENCES "delivery_notes"("id"),
  "picking_strategy"  TEXT NOT NULL DEFAULT 'fifo'
    CHECK ("picking_strategy" IN ('fifo','fefo','lifo','manual')),
  "status"            TEXT NOT NULL DEFAULT 'open'
    CHECK ("status" IN ('open','in_progress','completed','cancelled')),
  "assigned_to"       TEXT,
  "started_at"        TIMESTAMPTZ,
  "completed_at"      TIMESTAMPTZ,
  "tenant_id"         TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"        TEXT NOT NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_pick_lists_tenant_status"
  ON "pick_lists" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_pick_lists_delivery_note"
  ON "pick_lists" ("delivery_note_id");

ALTER TABLE "pick_lists" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pick_lists_tenant_isolation" ON "pick_lists";
CREATE POLICY "pick_lists_tenant_isolation"
  ON "pick_lists" USING ("tenant_id" = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS "pick_list_lines" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pick_list_id"    TEXT NOT NULL REFERENCES "pick_lists"("id") ON DELETE CASCADE,
  "product_id"      TEXT NOT NULL REFERENCES "products"("id"),
  "bin_id"          TEXT NOT NULL REFERENCES "storage_bins"("id"),
  "batch_id"        TEXT REFERENCES "batches"("id"),
  "quantity"         NUMERIC(15,4) NOT NULL,
  "picked_quantity"  NUMERIC(15,4) NOT NULL DEFAULT 0,
  "picked_by"       TEXT,
  "picked_at"       TIMESTAMPTZ,
  "sort_order"      INTEGER NOT NULL DEFAULT 0,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_pick_list_lines_pick_list"
  ON "pick_list_lines" ("pick_list_id");

ALTER TABLE "pick_list_lines" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pick_list_lines_tenant_isolation" ON "pick_list_lines";
CREATE POLICY "pick_list_lines_tenant_isolation"
  ON "pick_list_lines" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 1.4 Shipments (Pick/Pack/Ship)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "shipments" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "delivery_note_id"  TEXT NOT NULL REFERENCES "delivery_notes"("id"),
  "pick_list_id"      TEXT REFERENCES "pick_lists"("id"),
  "packing_date"      DATE,
  "weight_kg"         NUMERIC(12,2),
  "dimensions"        TEXT,
  "carrier"           TEXT,
  "tracking_number"   TEXT,
  "status"            TEXT NOT NULL DEFAULT 'packing'
    CHECK ("status" IN ('packing','packed','shipped','delivered','returned')),
  "shipped_at"        TIMESTAMPTZ,
  "delivered_at"      TIMESTAMPTZ,
  "tenant_id"         TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"        TEXT NOT NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_shipments_tenant_status"
  ON "shipments" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_shipments_delivery_note"
  ON "shipments" ("delivery_note_id");

CREATE INDEX IF NOT EXISTS "idx_shipments_tracking"
  ON "shipments" ("tracking_number")
  WHERE "tracking_number" IS NOT NULL;

ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipments_tenant_isolation" ON "shipments";
CREATE POLICY "shipments_tenant_isolation"
  ON "shipments" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 1.5 Barcode Scan Log (Mobile Scanning API backing)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "warehouse_scan_log" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "scan_type"     TEXT NOT NULL
    CHECK ("scan_type" IN ('putaway','pick','count','inquiry')),
  "barcode"       TEXT NOT NULL,
  "resolved_type" TEXT
    CHECK ("resolved_type" IN ('product','bin','batch','serial')),
  "product_id"    TEXT REFERENCES "products"("id"),
  "bin_id"        TEXT REFERENCES "storage_bins"("id"),
  "batch_id"      TEXT REFERENCES "batches"("id"),
  "quantity"       NUMERIC(15,4),
  "scanned_by"    TEXT NOT NULL,
  "scanned_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "tenant_id"     TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_warehouse_scan_log_tenant"
  ON "warehouse_scan_log" ("tenant_id", "scanned_at" DESC);

ALTER TABLE "warehouse_scan_log" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warehouse_scan_log_tenant_isolation" ON "warehouse_scan_log";
CREATE POLICY "warehouse_scan_log_tenant_isolation"
  ON "warehouse_scan_log" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 2: PS — Project System Enhancements
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 2.1 WBS Elements (multi-level Work Breakdown Structure)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "wbs_elements" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "project_id"      TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "parent_wbs_id"   TEXT REFERENCES "wbs_elements"("id"),
  "code"            TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "level"           INTEGER NOT NULL DEFAULT 1,
  "budget_satang"   BIGINT NOT NULL DEFAULT 0,
  "actual_satang"   BIGINT NOT NULL DEFAULT 0,
  "status"          TEXT NOT NULL DEFAULT 'active'
    CHECK ("status" IN ('active','completed','cancelled','on_hold')),
  "sort_order"      INTEGER NOT NULL DEFAULT 0,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("project_id", "code", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_wbs_elements_project"
  ON "wbs_elements" ("tenant_id", "project_id");

CREATE INDEX IF NOT EXISTS "idx_wbs_elements_parent"
  ON "wbs_elements" ("parent_wbs_id")
  WHERE "parent_wbs_id" IS NOT NULL;

ALTER TABLE "wbs_elements" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wbs_elements_tenant_isolation" ON "wbs_elements";
CREATE POLICY "wbs_elements_tenant_isolation"
  ON "wbs_elements" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 2.2 Network Activities (with dependencies for Gantt/CPM)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "project_activities" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "wbs_element_id"   TEXT NOT NULL REFERENCES "wbs_elements"("id") ON DELETE CASCADE,
  "name"             TEXT NOT NULL,
  "predecessor_ids"  TEXT[] DEFAULT '{}',
  "duration_days"    INTEGER NOT NULL DEFAULT 1,
  "planned_start"    DATE,
  "planned_end"      DATE,
  "actual_start"     DATE,
  "actual_end"       DATE,
  "status"           TEXT NOT NULL DEFAULT 'planned'
    CHECK ("status" IN ('planned','in_progress','completed','cancelled')),
  "assigned_to"      TEXT,
  "estimated_cost_satang" BIGINT DEFAULT 0,
  "actual_cost_satang"    BIGINT DEFAULT 0,
  "completion_percent"    INTEGER DEFAULT 0
    CHECK ("completion_percent" BETWEEN 0 AND 100),
  "tenant_id"        TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_project_activities_wbs"
  ON "project_activities" ("tenant_id", "wbs_element_id");

ALTER TABLE "project_activities" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_activities_tenant_isolation" ON "project_activities";
CREATE POLICY "project_activities_tenant_isolation"
  ON "project_activities" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 2.3 Milestone Billing Plans (links project phases to invoicing)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "billing_plans" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "project_id"      TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "phase_id"        TEXT REFERENCES "project_phases"("id"),
  "wbs_element_id"  TEXT REFERENCES "wbs_elements"("id"),
  "milestone_name"  TEXT NOT NULL,
  "planned_date"    DATE NOT NULL,
  "amount_satang"   BIGINT NOT NULL DEFAULT 0,
  "status"          TEXT NOT NULL DEFAULT 'planned'
    CHECK ("status" IN ('planned','due','billed','paid','cancelled')),
  "invoice_id"      TEXT REFERENCES "invoices"("id"),
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"      TEXT,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_billing_plans_project"
  ON "billing_plans" ("tenant_id", "project_id");

CREATE INDEX IF NOT EXISTS "idx_billing_plans_status"
  ON "billing_plans" ("tenant_id", "status");

ALTER TABLE "billing_plans" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_plans_tenant_isolation" ON "billing_plans";
CREATE POLICY "billing_plans_tenant_isolation"
  ON "billing_plans" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 3: QM — Quality Management Enhancements
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 3.1 Inspection Plans (dynamic, with auto-trigger rules)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "inspection_plans" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "product_id"          TEXT NOT NULL REFERENCES "products"("id"),
  "inspection_type"     TEXT NOT NULL
    CHECK ("inspection_type" IN ('incoming','in_process','final','periodic')),
  "frequency"           TEXT NOT NULL DEFAULT 'every_gr'
    CHECK ("frequency" IN ('every_gr','every_nth','random','skip')),
  "frequency_nth"       INTEGER DEFAULT 1,
  "sample_size_percent" NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  "characteristics"     JSONB NOT NULL DEFAULT '[]',
  "is_active"           BOOLEAN NOT NULL DEFAULT TRUE,
  "tenant_id"           TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_inspection_plans_product"
  ON "inspection_plans" ("tenant_id", "product_id");

CREATE INDEX IF NOT EXISTS "idx_inspection_plans_active"
  ON "inspection_plans" ("tenant_id", "is_active")
  WHERE "is_active" = TRUE;

ALTER TABLE "inspection_plans" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inspection_plans_tenant_isolation" ON "inspection_plans";
CREATE POLICY "inspection_plans_tenant_isolation"
  ON "inspection_plans" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 3.2 CAPA Records (Corrective & Preventive Action)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "capa_records" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "type"                TEXT NOT NULL
    CHECK ("type" IN ('corrective','preventive')),
  "source"              TEXT NOT NULL
    CHECK ("source" IN ('inspection','complaint','audit','internal','supplier')),
  "reference_id"        TEXT,
  "description"         TEXT NOT NULL,
  "root_cause"          TEXT,
  "corrective_action"   TEXT,
  "preventive_action"   TEXT,
  "status"              TEXT NOT NULL DEFAULT 'open'
    CHECK ("status" IN ('open','in_progress','implemented','verified','closed')),
  "assigned_to"         TEXT,
  "due_date"            DATE,
  "verified_by"         TEXT,
  "verified_at"         TIMESTAMPTZ,
  "closed_at"           TIMESTAMPTZ,
  "tenant_id"           TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"          TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_capa_records_tenant_status"
  ON "capa_records" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_capa_records_tenant_type"
  ON "capa_records" ("tenant_id", "type");

CREATE INDEX IF NOT EXISTS "idx_capa_records_due_date"
  ON "capa_records" ("tenant_id", "due_date")
  WHERE "status" NOT IN ('verified','closed');

ALTER TABLE "capa_records" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "capa_records_tenant_isolation" ON "capa_records";
CREATE POLICY "capa_records_tenant_isolation"
  ON "capa_records" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 3.3 Defect Records (linked to inspections + CAPA)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "defect_records" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "inspection_id"        TEXT NOT NULL REFERENCES "quality_inspections"("id"),
  "defect_code"          TEXT NOT NULL,
  "defect_description"   TEXT,
  "severity"             TEXT NOT NULL DEFAULT 'minor'
    CHECK ("severity" IN ('critical','major','minor')),
  "quantity_defective"   NUMERIC(15,4) NOT NULL DEFAULT 0,
  "cause_code"           TEXT,
  "capa_id"              TEXT REFERENCES "capa_records"("id"),
  "tenant_id"            TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"           TEXT,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_defect_records_inspection"
  ON "defect_records" ("tenant_id", "inspection_id");

CREATE INDEX IF NOT EXISTS "idx_defect_records_severity"
  ON "defect_records" ("tenant_id", "severity");

CREATE INDEX IF NOT EXISTS "idx_defect_records_capa"
  ON "defect_records" ("capa_id")
  WHERE "capa_id" IS NOT NULL;

ALTER TABLE "defect_records" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "defect_records_tenant_isolation" ON "defect_records";
CREATE POLICY "defect_records_tenant_isolation"
  ON "defect_records" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 4: Permissions
-- =========================================================================

INSERT INTO permissions (id, name, description) VALUES
  -- EWM: Storage Bins
  ('ewm:bin:create',           'ewm:bin:create',           'Create storage bins'),
  ('ewm:bin:read',             'ewm:bin:read',             'View storage bins'),
  ('ewm:bin:update',           'ewm:bin:update',           'Update storage bins'),
  -- EWM: Putaway
  ('ewm:putaway:create',       'ewm:putaway:create',       'Create putaway rules'),
  ('ewm:putaway:read',         'ewm:putaway:read',         'View putaway rules'),
  ('ewm:putaway:execute',      'ewm:putaway:execute',      'Execute putaway suggestions'),
  -- EWM: Pick Lists
  ('ewm:pick:create',          'ewm:pick:create',          'Create pick lists'),
  ('ewm:pick:read',            'ewm:pick:read',            'View pick lists'),
  ('ewm:pick:execute',         'ewm:pick:execute',         'Execute picking'),
  -- EWM: Shipments
  ('ewm:shipment:create',      'ewm:shipment:create',      'Create shipments'),
  ('ewm:shipment:read',        'ewm:shipment:read',        'View shipments'),
  ('ewm:shipment:update',      'ewm:shipment:update',      'Update shipments (pack/ship)'),
  -- EWM: Mobile Scanning
  ('ewm:scan:execute',         'ewm:scan:execute',         'Execute barcode scanning'),
  -- PS: WBS Elements
  ('ps:wbs:create',            'ps:wbs:create',            'Create WBS elements'),
  ('ps:wbs:read',              'ps:wbs:read',              'View WBS elements'),
  ('ps:wbs:update',            'ps:wbs:update',            'Update WBS elements'),
  -- PS: Network Activities
  ('ps:activity:create',       'ps:activity:create',       'Create project activities'),
  ('ps:activity:read',         'ps:activity:read',         'View project activities'),
  ('ps:activity:update',       'ps:activity:update',       'Update project activities'),
  -- PS: EVM
  ('ps:evm:read',              'ps:evm:read',              'View earned value metrics'),
  -- PS: Milestone Billing
  ('ps:billing:create',        'ps:billing:create',        'Create milestone billing plans'),
  ('ps:billing:read',          'ps:billing:read',          'View milestone billing plans'),
  ('ps:billing:execute',       'ps:billing:execute',       'Execute milestone billing'),
  -- QM: Inspection Plans
  ('qm:plan:create',           'qm:plan:create',           'Create inspection plans'),
  ('qm:plan:read',             'qm:plan:read',             'View inspection plans'),
  ('qm:plan:update',           'qm:plan:update',           'Update inspection plans'),
  -- QM: CAPA
  ('qm:capa:create',           'qm:capa:create',           'Create CAPA records'),
  ('qm:capa:read',             'qm:capa:read',             'View CAPA records'),
  ('qm:capa:update',           'qm:capa:update',           'Update CAPA records'),
  ('qm:capa:verify',           'qm:capa:verify',           'Verify CAPA records'),
  ('qm:capa:close',            'qm:capa:close',            'Close CAPA records'),
  -- QM: Defect Records
  ('qm:defect:create',         'qm:defect:create',         'Create defect records'),
  ('qm:defect:read',           'qm:defect:read',           'View defect records'),
  ('qm:defect:update',         'qm:defect:update',         'Update defect records')
ON CONFLICT (id) DO NOTHING;
