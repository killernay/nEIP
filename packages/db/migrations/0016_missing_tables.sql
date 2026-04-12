-- ============================================================
-- Migration: 0016_missing_tables
-- Description: Create missing AR tables (invoices, invoice_line_items,
--              ar_payments, invoice_payments) that were referenced by
--              migrations 0007-0009, 0013, 0015 but never created.
-- Created: 2026-04-12
-- ============================================================

-- --------------------------------------------------------
-- 1. invoices — AR invoice header
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "invoices" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_number"   TEXT NOT NULL,
  "customer_id"      TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'draft',
  "total_satang"     BIGINT NOT NULL DEFAULT 0,
  "paid_satang"      BIGINT NOT NULL DEFAULT 0,
  "due_date"         TEXT NOT NULL,
  "notes"            TEXT,
  "posted_at"        TIMESTAMPTZ,
  "journal_entry_id" TEXT REFERENCES "journal_entries"("id"),
  "delivery_note_id" TEXT,
  "sales_order_id"   TEXT,
  "currency_code"    TEXT NOT NULL DEFAULT 'THB',
  "exchange_rate"    NUMERIC(18,6) NOT NULL DEFAULT 1.000000,
  "local_amount_satang" BIGINT NOT NULL DEFAULT 0,
  "company_id"       TEXT REFERENCES "companies"("id"),
  "tenant_id"        TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "invoices_status_check"
    CHECK ("status" IN ('draft', 'posted', 'sent', 'paid', 'partial', 'overdue', 'void'))
);

-- --------------------------------------------------------
-- 2. invoice_line_items — AR invoice line items
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "invoice_line_items" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id"        TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "line_number"       INTEGER NOT NULL,
  "description"       TEXT NOT NULL,
  "quantity"          INTEGER NOT NULL DEFAULT 1,
  "unit_price_satang" BIGINT NOT NULL DEFAULT 0,
  "total_satang"      BIGINT NOT NULL DEFAULT 0,
  "account_id"        TEXT REFERENCES "chart_of_accounts"("id"),
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 3. ar_payments — AR payment header
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ar_payments" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_number"  TEXT NOT NULL,
  "customer_id"      TEXT,
  "amount_satang"    BIGINT NOT NULL DEFAULT 0,
  "payment_date"     TEXT NOT NULL,
  "payment_method"   TEXT NOT NULL DEFAULT 'cash',
  "reference"        TEXT,
  "notes"            TEXT,
  "status"           TEXT NOT NULL DEFAULT 'unmatched',
  "journal_entry_id" TEXT REFERENCES "journal_entries"("id"),
  "tenant_id"        TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------
-- 4. invoice_payments — junction: invoice <-> payment
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "invoice_payments" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id"     TEXT NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "payment_id"     TEXT NOT NULL REFERENCES "ar_payments"("id") ON DELETE CASCADE,
  "amount_satang"  BIGINT NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("invoice_id", "payment_id")
);

-- --------------------------------------------------------
-- 5. Indexes (from migrations 0007, 0008, 0009)
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_status"
  ON "invoices" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_invoices_posted_at"
  ON "invoices" ("tenant_id", "posted_at")
  WHERE "posted_at" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_invoices_delivery_note"
  ON "invoices" ("delivery_note_id")
  WHERE "delivery_note_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_invoices_sales_order"
  ON "invoices" ("sales_order_id")
  WHERE "sales_order_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_ar_payments_journal_entry_id"
  ON "ar_payments" ("journal_entry_id")
  WHERE "journal_entry_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_invoice_line_items_invoice"
  ON "invoice_line_items" ("invoice_id");

CREATE INDEX IF NOT EXISTS "idx_invoice_payments_invoice"
  ON "invoice_payments" ("invoice_id");

CREATE INDEX IF NOT EXISTS "idx_invoice_payments_payment"
  ON "invoice_payments" ("payment_id");

-- --------------------------------------------------------
-- 6. Row-Level Security
-- --------------------------------------------------------
ALTER TABLE "invoices"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ar_payments"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_payments"   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_tenant_isolation" ON "invoices";
CREATE POLICY "invoices_tenant_isolation"
  ON "invoices" USING ("tenant_id" = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS "ar_payments_tenant_isolation" ON "ar_payments";
CREATE POLICY "ar_payments_tenant_isolation"
  ON "ar_payments" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- --------------------------------------------------------
-- 7. Re-apply migration 0015 FK that failed earlier
-- --------------------------------------------------------
ALTER TABLE dunning_history DROP CONSTRAINT IF EXISTS fk_dunning_invoice;
ALTER TABLE dunning_history ADD CONSTRAINT fk_dunning_invoice
  FOREIGN KEY (invoice_id) REFERENCES invoices(id);
