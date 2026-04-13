-- ============================================================
-- Migration: 0022_sap_gap_phase1
-- Description: SAP-gap modules Phase 1 — Batch Payment Runs,
--              Collection Promises, Down Payments, Pro-Forma Invoice support
-- Created: 2026-04-13
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. Batch Payment Runs (SAP F110 equivalent)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "batch_payment_runs" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_date"            DATE NOT NULL DEFAULT CURRENT_DATE,
  "status"              TEXT NOT NULL DEFAULT 'proposed',
  "total_vendors"       INTEGER NOT NULL DEFAULT 0,
  "total_amount_satang" BIGINT NOT NULL DEFAULT 0,
  "bank_file_format"    TEXT NOT NULL DEFAULT 'promptpay',
  "proposal_data"       JSONB,
  "executed_at"         TIMESTAMPTZ,
  "tenant_id"           TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"          TEXT NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "batch_payment_runs_status_check"
    CHECK ("status" IN ('proposed', 'executed', 'cancelled')),
  CONSTRAINT "batch_payment_runs_format_check"
    CHECK ("bank_file_format" IN ('promptpay', 'bahtnet', 'smart'))
);

CREATE INDEX IF NOT EXISTS "idx_batch_payment_runs_tenant_status"
  ON "batch_payment_runs" ("tenant_id", "status");

ALTER TABLE "batch_payment_runs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "batch_payment_runs_tenant_isolation" ON "batch_payment_runs";
CREATE POLICY "batch_payment_runs_tenant_isolation"
  ON "batch_payment_runs" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 2. Collection Promises (AR Collections Worklist)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "collection_promises" (
  "id"                     TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id"             TEXT NOT NULL REFERENCES "invoices"("id"),
  "customer_id"            TEXT NOT NULL,
  "promised_date"          DATE NOT NULL,
  "promised_amount_satang" BIGINT NOT NULL DEFAULT 0,
  "status"                 TEXT NOT NULL DEFAULT 'pending',
  "dunning_level"          INTEGER NOT NULL DEFAULT 0,
  "notes"                  TEXT,
  "tenant_id"              TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"             TEXT NOT NULL,
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "collection_promises_status_check"
    CHECK ("status" IN ('pending', 'kept', 'broken', 'escalated'))
);

CREATE INDEX IF NOT EXISTS "idx_collection_promises_tenant_invoice"
  ON "collection_promises" ("tenant_id", "invoice_id");

CREATE INDEX IF NOT EXISTS "idx_collection_promises_tenant_customer"
  ON "collection_promises" ("tenant_id", "customer_id");

ALTER TABLE "collection_promises" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collection_promises_tenant_isolation" ON "collection_promises";
CREATE POLICY "collection_promises_tenant_isolation"
  ON "collection_promises" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 3. Down Payments (AR + AP)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "down_payments" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"                  TEXT NOT NULL,
  "document_number"       TEXT NOT NULL,
  "contact_id"            TEXT NOT NULL,
  "reference_type"        TEXT,
  "reference_id"          TEXT,
  "amount_satang"         BIGINT NOT NULL DEFAULT 0,
  "cleared_amount_satang" BIGINT NOT NULL DEFAULT 0,
  "status"                TEXT NOT NULL DEFAULT 'requested',
  "journal_entry_id"      TEXT REFERENCES "journal_entries"("id"),
  "clearing_je_id"        TEXT REFERENCES "journal_entries"("id"),
  "tenant_id"             TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"            TEXT NOT NULL,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "down_payments_type_check"
    CHECK ("type" IN ('ar', 'ap')),
  CONSTRAINT "down_payments_status_check"
    CHECK ("status" IN ('requested', 'paid', 'partial_cleared', 'cleared'))
);

CREATE INDEX IF NOT EXISTS "idx_down_payments_tenant_type"
  ON "down_payments" ("tenant_id", "type");

CREATE INDEX IF NOT EXISTS "idx_down_payments_tenant_contact"
  ON "down_payments" ("tenant_id", "contact_id");

ALTER TABLE "down_payments" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "down_payments_tenant_isolation" ON "down_payments";
CREATE POLICY "down_payments_tenant_isolation"
  ON "down_payments" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- ---------------------------------------------------------------------------
-- 4. Pro-Forma Invoice support — add invoice_type column to invoices
-- ---------------------------------------------------------------------------

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_type"
  TEXT NOT NULL DEFAULT 'standard';

-- Constraint: only allow known invoice types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_type_check'
  ) THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_type_check"
      CHECK ("invoice_type" IN ('standard', 'proforma', 'credit_note'));
  END IF;
END $$;
