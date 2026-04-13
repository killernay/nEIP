-- ============================================================
-- Migration: 0025_sales_gaps
-- Description: Sales & Distribution HIGH gaps — Rebate Management,
--              Free Goods, Milestone Billing, Periodic/Subscription Billing,
--              Drop-ship, Batch Determination, Partner Determination,
--              Output Determination, Intercompany Billing, Serial Number in SD
-- Created: 2026-04-13
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. Rebate Management (SAP VBO1/VBO2/VBO3 equivalent)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "rebate_agreements" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id"          TEXT NOT NULL,
  "product_id"           TEXT,
  "rebate_type"          TEXT NOT NULL DEFAULT 'volume',
  "threshold_quantity"   INTEGER,
  "threshold_satang"     BIGINT,
  "rebate_percent_bp"    INTEGER NOT NULL DEFAULT 0,
  "valid_from"           DATE NOT NULL,
  "valid_to"             DATE NOT NULL,
  "status"               TEXT NOT NULL DEFAULT 'active',
  "accrued_satang"       BIGINT NOT NULL DEFAULT 0,
  "tenant_id"            TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"           TEXT NOT NULL,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "rebate_agreements_type_check"
    CHECK ("rebate_type" IN ('volume', 'value')),
  CONSTRAINT "rebate_agreements_status_check"
    CHECK ("status" IN ('active', 'inactive', 'settled'))
);

CREATE INDEX IF NOT EXISTS "idx_rebate_agreements_tenant_customer"
  ON "rebate_agreements" ("tenant_id", "customer_id");

CREATE INDEX IF NOT EXISTS "idx_rebate_agreements_tenant_status"
  ON "rebate_agreements" ("tenant_id", "status");

ALTER TABLE "rebate_agreements" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rebate_agreements_tenant_isolation" ON "rebate_agreements";
CREATE POLICY "rebate_agreements_tenant_isolation"
  ON "rebate_agreements" USING ("tenant_id" = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS "rebate_settlements" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "agreement_id"         TEXT NOT NULL REFERENCES "rebate_agreements"("id"),
  "period"               TEXT NOT NULL,
  "settled_amount_satang" BIGINT NOT NULL DEFAULT 0,
  "credit_note_id"       TEXT,
  "tenant_id"            TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_rebate_settlements_agreement"
  ON "rebate_settlements" ("agreement_id");

ALTER TABLE "rebate_settlements" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rebate_settlements_tenant_isolation" ON "rebate_settlements";
CREATE POLICY "rebate_settlements_tenant_isolation"
  ON "rebate_settlements" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 2. Free Goods Rules (SAP VBN1 equivalent)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "free_goods_rules" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "buy_product_id"    TEXT NOT NULL,
  "buy_quantity"      INTEGER NOT NULL DEFAULT 1,
  "free_product_id"   TEXT NOT NULL,
  "free_quantity"     INTEGER NOT NULL DEFAULT 1,
  "valid_from"        DATE NOT NULL,
  "valid_to"          DATE NOT NULL,
  "tenant_id"         TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_free_goods_rules_tenant_product"
  ON "free_goods_rules" ("tenant_id", "buy_product_id");

ALTER TABLE "free_goods_rules" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "free_goods_rules_tenant_isolation" ON "free_goods_rules";
CREATE POLICY "free_goods_rules_tenant_isolation"
  ON "free_goods_rules" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 3. Milestone Billing (SAP Billing Plans)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "billing_plans" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "reference_type"   TEXT NOT NULL,
  "reference_id"     TEXT NOT NULL,
  "tenant_id"        TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "billing_plans_ref_type_check"
    CHECK ("reference_type" IN ('project', 'sales_order'))
);

CREATE INDEX IF NOT EXISTS "idx_billing_plans_tenant_ref"
  ON "billing_plans" ("tenant_id", "reference_type", "reference_id");

ALTER TABLE "billing_plans" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_plans_tenant_isolation" ON "billing_plans";
CREATE POLICY "billing_plans_tenant_isolation"
  ON "billing_plans" USING ("tenant_id" = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS "billing_plan_lines" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id"          TEXT NOT NULL REFERENCES "billing_plans"("id") ON DELETE CASCADE,
  "milestone_name"   TEXT NOT NULL,
  "billing_date"     DATE NOT NULL,
  "percentage"       INTEGER NOT NULL DEFAULT 0,
  "amount_satang"    BIGINT NOT NULL DEFAULT 0,
  "status"           TEXT NOT NULL DEFAULT 'planned',
  "invoice_id"       TEXT,
  "tenant_id"        TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "billing_plan_lines_status_check"
    CHECK ("status" IN ('planned', 'billed'))
);

CREATE INDEX IF NOT EXISTS "idx_billing_plan_lines_plan"
  ON "billing_plan_lines" ("plan_id");

ALTER TABLE "billing_plan_lines" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_plan_lines_tenant_isolation" ON "billing_plan_lines";
CREATE POLICY "billing_plan_lines_tenant_isolation"
  ON "billing_plan_lines" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 4. Periodic / Subscription Billing
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "billing_subscriptions" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id"       TEXT NOT NULL,
  "description"       TEXT NOT NULL,
  "amount_satang"     BIGINT NOT NULL DEFAULT 0,
  "frequency"         TEXT NOT NULL DEFAULT 'monthly',
  "next_billing_date" DATE NOT NULL,
  "end_date"          DATE,
  "status"            TEXT NOT NULL DEFAULT 'active',
  "tenant_id"         TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"        TEXT NOT NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "billing_subscriptions_freq_check"
    CHECK ("frequency" IN ('monthly', 'quarterly', 'annually')),
  CONSTRAINT "billing_subscriptions_status_check"
    CHECK ("status" IN ('active', 'paused', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS "idx_billing_subscriptions_tenant_status"
  ON "billing_subscriptions" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_billing_subscriptions_next_billing"
  ON "billing_subscriptions" ("tenant_id", "next_billing_date")
  WHERE "status" = 'active';

ALTER TABLE "billing_subscriptions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_subscriptions_tenant_isolation" ON "billing_subscriptions";
CREATE POLICY "billing_subscriptions_tenant_isolation"
  ON "billing_subscriptions" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 5. Third-Party Orders (Drop-ship) — add fulfillment_type to sales_orders
-- ---------------------------------------------------------------------------

ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "fulfillment_type"
  TEXT NOT NULL DEFAULT 'stock';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_orders_fulfillment_type_check'
  ) THEN
    ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_fulfillment_type_check"
      CHECK ("fulfillment_type" IN ('stock', 'dropship'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Batch Determination (FEFO / FIFO)
-- ---------------------------------------------------------------------------

-- Add quantity tracking to batches for allocation
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "quantity_on_hand" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "receipt_date" DATE;

-- ---------------------------------------------------------------------------
-- 7. Partner Determination (sold-to / ship-to / bill-to / payer)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "contact_partners" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "contact_id"          TEXT NOT NULL,
  "partner_function"    TEXT NOT NULL,
  "partner_contact_id"  TEXT NOT NULL,
  "tenant_id"           TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "contact_partners_function_check"
    CHECK ("partner_function" IN ('sold_to', 'ship_to', 'bill_to', 'payer'))
);

CREATE INDEX IF NOT EXISTS "idx_contact_partners_tenant_contact"
  ON "contact_partners" ("tenant_id", "contact_id");

ALTER TABLE "contact_partners" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_partners_tenant_isolation" ON "contact_partners";
CREATE POLICY "contact_partners_tenant_isolation"
  ON "contact_partners" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- Add partner fields to sales_orders
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "ship_to_contact_id" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "bill_to_contact_id" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "payer_contact_id"   TEXT;

-- ---------------------------------------------------------------------------
-- 8. Output Determination (auto email / print / webhook)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "output_rules" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_type"   TEXT NOT NULL,
  "condition"       TEXT NOT NULL DEFAULT 'on_post',
  "output_type"     TEXT NOT NULL DEFAULT 'email',
  "template_name"   TEXT NOT NULL,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "output_rules_condition_check"
    CHECK ("condition" IN ('on_post', 'on_send', 'on_approve')),
  CONSTRAINT "output_rules_output_type_check"
    CHECK ("output_type" IN ('email', 'print', 'webhook'))
);

CREATE INDEX IF NOT EXISTS "idx_output_rules_tenant_doctype"
  ON "output_rules" ("tenant_id", "document_type");

ALTER TABLE "output_rules" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "output_rules_tenant_isolation" ON "output_rules";
CREATE POLICY "output_rules_tenant_isolation"
  ON "output_rules" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 9. Intercompany Billing — IC invoice tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "ic_invoices" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_company_id"     TEXT NOT NULL,
  "target_company_id"     TEXT NOT NULL,
  "source_invoice_id"     TEXT,
  "target_invoice_id"     TEXT,
  "customer_invoice_id"   TEXT,
  "amount_satang"         BIGINT NOT NULL DEFAULT 0,
  "status"                TEXT NOT NULL DEFAULT 'draft',
  "tenant_id"             TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ic_invoices_status_check"
    CHECK ("status" IN ('draft', 'posted', 'settled'))
);

CREATE INDEX IF NOT EXISTS "idx_ic_invoices_tenant_status"
  ON "ic_invoices" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_ic_invoices_source_company"
  ON "ic_invoices" ("tenant_id", "source_company_id");

ALTER TABLE "ic_invoices" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ic_invoices_tenant_isolation" ON "ic_invoices";
CREATE POLICY "ic_invoices_tenant_isolation"
  ON "ic_invoices" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 10. Serial Number in SD — add serial tracking to delivery note lines
-- ---------------------------------------------------------------------------

ALTER TABLE "delivery_note_lines" ADD COLUMN IF NOT EXISTS "serial_numbers" JSONB;

-- =========================================================================
-- Permissions
-- =========================================================================

INSERT INTO permissions (id, name, description) VALUES
  -- Rebate Management
  ('sd:rebate:create',    'sd:rebate:create',    'Create rebate agreements'),
  ('sd:rebate:read',      'sd:rebate:read',      'View rebate agreements'),
  ('sd:rebate:update',    'sd:rebate:update',    'Update rebate agreements'),
  ('sd:rebate:settle',    'sd:rebate:settle',    'Settle rebate agreements'),
  -- Free Goods
  ('sd:freegoods:create', 'sd:freegoods:create', 'Create free goods rules'),
  ('sd:freegoods:read',   'sd:freegoods:read',   'View free goods rules'),
  ('sd:freegoods:update', 'sd:freegoods:update', 'Update free goods rules'),
  -- Milestone Billing
  ('sd:billing_plan:create', 'sd:billing_plan:create', 'Create billing plans'),
  ('sd:billing_plan:read',   'sd:billing_plan:read',   'View billing plans'),
  ('sd:billing_plan:update', 'sd:billing_plan:update', 'Update billing plans'),
  ('sd:billing_plan:bill',   'sd:billing_plan:bill',   'Execute milestone billing'),
  -- Subscription Billing
  ('sd:subscription:create', 'sd:subscription:create', 'Create billing subscriptions'),
  ('sd:subscription:read',   'sd:subscription:read',   'View billing subscriptions'),
  ('sd:subscription:update', 'sd:subscription:update', 'Update billing subscriptions'),
  ('sd:subscription:run',    'sd:subscription:run',    'Run subscription billing'),
  -- Drop-ship
  ('sd:dropship:create',  'sd:dropship:create',  'Create drop-ship orders'),
  ('sd:dropship:read',    'sd:dropship:read',    'View drop-ship orders'),
  -- Batch Determination
  ('inventory:batch_det:read', 'inventory:batch_det:read', 'Run batch determination'),
  -- Partner Determination
  ('sd:partner:create',   'sd:partner:create',   'Create contact partners'),
  ('sd:partner:read',     'sd:partner:read',      'View contact partners'),
  ('sd:partner:update',   'sd:partner:update',   'Update contact partners'),
  -- Output Determination
  ('sd:output:create',    'sd:output:create',    'Create output rules'),
  ('sd:output:read',      'sd:output:read',      'View output rules'),
  ('sd:output:update',    'sd:output:update',    'Update output rules'),
  ('sd:output:send',      'sd:output:send',      'Send output documents'),
  -- Intercompany Billing
  ('sd:ic_billing:create', 'sd:ic_billing:create', 'Create intercompany invoices'),
  ('sd:ic_billing:read',   'sd:ic_billing:read',   'View intercompany invoices'),
  ('sd:ic_billing:settle', 'sd:ic_billing:settle', 'Settle intercompany invoices')
ON CONFLICT (id) DO NOTHING;
