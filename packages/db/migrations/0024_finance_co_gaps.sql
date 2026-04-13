-- 0024_finance_co_gaps.sql
-- SAP-gap Phase 2: Finance (FI) + Controlling (CO) HIGH-priority gaps
-- 15 gaps: AuC, MT940, Vendor Eval, Interest, Disputes, Payment Advice,
--          Standard Cost, Material Ledger, WIP, Cost Allocation, Profit Center BS,
--          Contribution Margin, Internal Orders, Transfer Pricing, Closing Cockpit

-- ---------------------------------------------------------------------------
-- 1. Asset Under Construction (AuC) — extend fixed_assets
-- ---------------------------------------------------------------------------

ALTER TABLE "fixed_assets"
  ADD COLUMN IF NOT EXISTS "is_under_construction" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "capitalization_date" DATE;

-- Update status CHECK to include 'under_construction'
ALTER TABLE "fixed_assets" DROP CONSTRAINT IF EXISTS "fixed_assets_status_check";
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_status_check"
  CHECK ("status" IN ('active', 'disposed', 'written_off', 'under_construction'));

-- ---------------------------------------------------------------------------
-- 3. Vendor Evaluation Scorecard
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "vendor_evaluations" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "vendor_id"       TEXT NOT NULL,
  "period"          TEXT NOT NULL,
  "delivery_score"  NUMERIC(5,2) NOT NULL DEFAULT 0,
  "quality_score"   NUMERIC(5,2) NOT NULL DEFAULT 0,
  "price_score"     NUMERIC(5,2) NOT NULL DEFAULT 0,
  "service_score"   NUMERIC(5,2) NOT NULL DEFAULT 0,
  "overall_score"   NUMERIC(5,2) NOT NULL DEFAULT 0,
  "evaluator_id"    TEXT NOT NULL,
  "notes"           TEXT,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_vendor_evaluations_tenant_vendor"
  ON "vendor_evaluations" ("tenant_id", "vendor_id");

ALTER TABLE "vendor_evaluations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendor_evaluations_tenant_isolation"
  ON "vendor_evaluations" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 5. Dispute Management (AR)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "ar_disputes" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id"      TEXT NOT NULL,
  "customer_id"     TEXT NOT NULL,
  "dispute_type"    TEXT NOT NULL,
  "amount_satang"   BIGINT NOT NULL DEFAULT 0,
  "status"          TEXT NOT NULL DEFAULT 'open',
  "resolution"      TEXT,
  "credit_note_id"  TEXT,
  "notes"           TEXT,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"      TEXT NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ar_disputes_status_check"
    CHECK ("status" IN ('open', 'in_progress', 'resolved', 'closed'))
);

CREATE INDEX IF NOT EXISTS "idx_ar_disputes_tenant_status"
  ON "ar_disputes" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "idx_ar_disputes_invoice"
  ON "ar_disputes" ("invoice_id");

ALTER TABLE "ar_disputes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_disputes_tenant_isolation"
  ON "ar_disputes" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 7. Standard Cost Estimate (CO)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "standard_costs" (
  "id"                       TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id"               TEXT NOT NULL,
  "fiscal_year"              INTEGER NOT NULL,
  "material_cost_satang"     BIGINT NOT NULL DEFAULT 0,
  "labor_cost_satang"        BIGINT NOT NULL DEFAULT 0,
  "overhead_cost_satang"     BIGINT NOT NULL DEFAULT 0,
  "total_standard_cost_satang" BIGINT NOT NULL DEFAULT 0,
  "tenant_id"                TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"               TEXT NOT NULL,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_standard_costs_product_year"
  ON "standard_costs" ("tenant_id", "product_id", "fiscal_year");

ALTER TABLE "standard_costs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "standard_costs_tenant_isolation"
  ON "standard_costs" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 8. Material Ledger / Actual Costing
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "material_ledger_entries" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id"          TEXT NOT NULL,
  "period"              TEXT NOT NULL,
  "actual_cost_satang"  BIGINT NOT NULL DEFAULT 0,
  "standard_cost_satang" BIGINT NOT NULL DEFAULT 0,
  "variance_satang"     BIGINT NOT NULL DEFAULT 0,
  "tenant_id"           TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"          TEXT NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_material_ledger_product_period"
  ON "material_ledger_entries" ("tenant_id", "product_id", "period");

ALTER TABLE "material_ledger_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material_ledger_entries_tenant_isolation"
  ON "material_ledger_entries" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 9. WIP Calculation
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "wip_valuations" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "production_order_id"   TEXT NOT NULL,
  "period"                TEXT NOT NULL,
  "material_wip_satang"   BIGINT NOT NULL DEFAULT 0,
  "labor_wip_satang"      BIGINT NOT NULL DEFAULT 0,
  "total_wip_satang"      BIGINT NOT NULL DEFAULT 0,
  "tenant_id"             TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"            TEXT NOT NULL,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_wip_valuations_order_period"
  ON "wip_valuations" ("tenant_id", "production_order_id", "period");

ALTER TABLE "wip_valuations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wip_valuations_tenant_isolation"
  ON "wip_valuations" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 10. Cost Allocation Cycles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "cost_allocation_rules" (
  "id"                      TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"                    TEXT NOT NULL,
  "source_cost_center_id"   TEXT NOT NULL,
  "target_cost_center_ids"  TEXT[] NOT NULL DEFAULT '{}',
  "allocation_basis"        TEXT NOT NULL DEFAULT 'fixed_percent',
  "percentages"             NUMERIC[] NOT NULL DEFAULT '{}',
  "tenant_id"               TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"              TEXT NOT NULL,
  "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cost_allocation_rules_basis_check"
    CHECK ("allocation_basis" IN ('fixed_percent', 'headcount', 'area'))
);

CREATE INDEX IF NOT EXISTS "idx_cost_allocation_rules_tenant"
  ON "cost_allocation_rules" ("tenant_id");

ALTER TABLE "cost_allocation_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_allocation_rules_tenant_isolation"
  ON "cost_allocation_rules" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 13. Internal Orders with Settlement
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "internal_orders" (
  "id"                        TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "code"                      TEXT NOT NULL,
  "name"                      TEXT NOT NULL,
  "order_type"                TEXT NOT NULL DEFAULT 'overhead',
  "status"                    TEXT NOT NULL DEFAULT 'open',
  "budget_satang"             BIGINT NOT NULL DEFAULT 0,
  "actual_satang"             BIGINT NOT NULL DEFAULT 0,
  "settlement_cost_center_id" TEXT,
  "settlement_gl_account_id"  TEXT,
  "tenant_id"                 TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"                TEXT NOT NULL,
  "created_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "internal_orders_type_check"
    CHECK ("order_type" IN ('overhead', 'investment', 'accrual')),
  CONSTRAINT "internal_orders_status_check"
    CHECK ("status" IN ('open', 'released', 'technically_complete', 'closed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_internal_orders_code"
  ON "internal_orders" ("tenant_id", "code");

ALTER TABLE "internal_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internal_orders_tenant_isolation"
  ON "internal_orders" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 14. Transfer Pricing Rules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "transfer_pricing_rules" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "from_company_id" TEXT NOT NULL,
  "to_company_id"   TEXT NOT NULL,
  "product_id"      TEXT,
  "method"          TEXT NOT NULL DEFAULT 'cost_plus',
  "markup_bp"       INTEGER NOT NULL DEFAULT 0,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"      TEXT NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "transfer_pricing_rules_method_check"
    CHECK ("method" IN ('cost_plus', 'market', 'negotiated'))
);

CREATE INDEX IF NOT EXISTS "idx_transfer_pricing_rules_companies"
  ON "transfer_pricing_rules" ("tenant_id", "from_company_id", "to_company_id");

ALTER TABLE "transfer_pricing_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfer_pricing_rules_tenant_isolation"
  ON "transfer_pricing_rules" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 15. Financial Closing Cockpit
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "closing_tasks" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "period"        TEXT NOT NULL,
  "task_name"     TEXT NOT NULL,
  "task_type"     TEXT NOT NULL,
  "sequence"      INTEGER NOT NULL DEFAULT 0,
  "status"        TEXT NOT NULL DEFAULT 'pending',
  "completed_by"  TEXT,
  "completed_at"  TIMESTAMPTZ,
  "notes"         TEXT,
  "tenant_id"     TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "closing_tasks_status_check"
    CHECK ("status" IN ('pending', 'in_progress', 'completed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS "idx_closing_tasks_tenant_period"
  ON "closing_tasks" ("tenant_id", "period");

ALTER TABLE "closing_tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closing_tasks_tenant_isolation"
  ON "closing_tasks" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- Seed default permissions for new FI/CO gaps
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("id", "name", "description") VALUES
  ('fi:asset:capitalize',         'fi:asset:capitalize',         'Capitalize asset under construction'),
  ('fi:bank:import-mt940',        'fi:bank:import-mt940',        'Import MT940 bank statements'),
  ('ap:vendor:evaluate',          'ap:vendor:evaluate',          'Evaluate vendor scorecard'),
  ('ar:interest:run',             'ar:interest:run',             'Run interest on overdue calculation'),
  ('ar:dispute:create',           'ar:dispute:create',           'Create AR dispute'),
  ('ar:dispute:read',             'ar:dispute:read',             'Read AR disputes'),
  ('ar:dispute:resolve',          'ar:dispute:resolve',          'Resolve AR dispute'),
  ('ar:payment-advice:process',   'ar:payment-advice:process',   'Process payment advice'),
  ('co:standard-cost:calculate',  'co:standard-cost:calculate',  'Calculate standard costs'),
  ('co:standard-cost:read',       'co:standard-cost:read',       'Read standard costs'),
  ('co:actual-cost:run',          'co:actual-cost:run',          'Run actual costing / material ledger'),
  ('co:actual-cost:read',         'co:actual-cost:read',         'Read material ledger entries'),
  ('co:wip:calculate',            'co:wip:calculate',            'Calculate WIP valuations'),
  ('co:wip:read',                 'co:wip:read',                 'Read WIP valuations'),
  ('co:allocation:manage',        'co:allocation:manage',        'Manage cost allocation rules'),
  ('co:allocation:run',           'co:allocation:run',           'Execute cost allocation cycle'),
  ('co:internal-order:create',    'co:internal-order:create',    'Create internal orders'),
  ('co:internal-order:read',      'co:internal-order:read',      'Read internal orders'),
  ('co:internal-order:update',    'co:internal-order:update',    'Update internal orders'),
  ('co:internal-order:settle',    'co:internal-order:settle',    'Settle internal orders'),
  ('co:transfer-pricing:manage',  'co:transfer-pricing:manage',  'Manage transfer pricing rules'),
  ('co:transfer-pricing:read',    'co:transfer-pricing:read',    'Read transfer pricing rules'),
  ('fi:closing:manage',           'fi:closing:manage',           'Manage closing cockpit tasks'),
  ('fi:closing:read',             'fi:closing:read',             'Read closing cockpit'),
  ('report:contribution-margin:read', 'report:contribution-margin:read', 'Read contribution margin report')
ON CONFLICT ("id") DO NOTHING;
