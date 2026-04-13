-- ============================================================
-- Migration: 0023_critical_compliance
-- Description: CRITICAL compliance features — IFRS 16 Lease Accounting,
--   Parallel Accounting (IFRS/Thai GAAP), e-Tax Invoice XML,
--   Revenue Recognition (IFRS 15), Deferred Tax Calculation
-- Created: 2026-04-13
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. IFRS 16 Lease Accounting
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lease_contracts" (
  "id"                          TEXT PRIMARY KEY,
  "contract_number"             TEXT NOT NULL,
  "lessor"                      TEXT NOT NULL,
  "lessee_company_id"           TEXT NOT NULL,
  "asset_description"           TEXT NOT NULL,
  "lease_type"                  TEXT NOT NULL DEFAULT 'operating'
    CHECK ("lease_type" IN ('operating', 'finance')),
  "start_date"                  TEXT NOT NULL,
  "end_date"                    TEXT NOT NULL,
  "monthly_payment_satang"      BIGINT NOT NULL DEFAULT 0,
  "total_payments"              INTEGER NOT NULL DEFAULT 0,
  "discount_rate_bp"            INTEGER NOT NULL DEFAULT 0,
  "right_of_use_asset_satang"   BIGINT NOT NULL DEFAULT 0,
  "lease_liability_satang"      BIGINT NOT NULL DEFAULT 0,
  "status"                      TEXT NOT NULL DEFAULT 'draft'
    CHECK ("status" IN ('draft', 'active', 'terminated', 'expired')),
  "tenant_id"                   TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"                  TEXT NOT NULL,
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_lease_contracts_tenant_status"
  ON "lease_contracts" ("tenant_id", "status");

ALTER TABLE "lease_contracts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lease_contracts_tenant_isolation" ON "lease_contracts";
CREATE POLICY "lease_contracts_tenant_isolation"
  ON "lease_contracts"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

CREATE TABLE IF NOT EXISTS "lease_schedules" (
  "id"                          TEXT PRIMARY KEY,
  "lease_id"                    TEXT NOT NULL REFERENCES "lease_contracts"("id") ON DELETE CASCADE,
  "period_date"                 TEXT NOT NULL,
  "payment_satang"              BIGINT NOT NULL DEFAULT 0,
  "interest_satang"             BIGINT NOT NULL DEFAULT 0,
  "principal_satang"            BIGINT NOT NULL DEFAULT 0,
  "remaining_liability_satang"  BIGINT NOT NULL DEFAULT 0,
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_lease_schedules_lease"
  ON "lease_schedules" ("lease_id");

-- ---------------------------------------------------------------------------
-- 2. Parallel Accounting (IFRS + Thai GAAP)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "accounting_standards" (
  "code"        TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "accounting_standards" (code, name) VALUES
  ('IFRS', 'International Financial Reporting Standards'),
  ('THAI_GAAP', 'Thai Generally Accepted Accounting Principles'),
  ('TFRS_NPAE', 'Thai Financial Reporting Standards for Non-Publicly Accountable Entities')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS "parallel_ledger_entries" (
  "id"                TEXT PRIMARY KEY,
  "journal_entry_id"  TEXT NOT NULL REFERENCES "journal_entries"("id") ON DELETE CASCADE,
  "standard_code"     TEXT NOT NULL REFERENCES "accounting_standards"("code"),
  "account_id"        TEXT NOT NULL,
  "description"       TEXT,
  "debit_satang"      BIGINT NOT NULL DEFAULT 0,
  "credit_satang"     BIGINT NOT NULL DEFAULT 0,
  "tenant_id"         TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"        TEXT NOT NULL,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_parallel_ledger_je_standard"
  ON "parallel_ledger_entries" ("journal_entry_id", "standard_code");

CREATE INDEX IF NOT EXISTS "idx_parallel_ledger_tenant_standard"
  ON "parallel_ledger_entries" ("tenant_id", "standard_code");

ALTER TABLE "parallel_ledger_entries" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parallel_ledger_entries_tenant_isolation" ON "parallel_ledger_entries";
CREATE POLICY "parallel_ledger_entries_tenant_isolation"
  ON "parallel_ledger_entries"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- ---------------------------------------------------------------------------
-- 3. Revenue Recognition (IFRS 15)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "revenue_contracts" (
  "id"                  TEXT PRIMARY KEY,
  "contract_number"     TEXT NOT NULL,
  "customer_id"         TEXT NOT NULL,
  "contract_date"       TEXT NOT NULL,
  "total_price_satang"  BIGINT NOT NULL DEFAULT 0,
  "status"              TEXT NOT NULL DEFAULT 'draft'
    CHECK ("status" IN ('draft', 'active', 'completed', 'cancelled')),
  "tenant_id"           TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"          TEXT NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_revenue_contracts_tenant_status"
  ON "revenue_contracts" ("tenant_id", "status");

ALTER TABLE "revenue_contracts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "revenue_contracts_tenant_isolation" ON "revenue_contracts";
CREATE POLICY "revenue_contracts_tenant_isolation"
  ON "revenue_contracts"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

CREATE TABLE IF NOT EXISTS "performance_obligations" (
  "id"                    TEXT PRIMARY KEY,
  "contract_id"           TEXT NOT NULL REFERENCES "revenue_contracts"("id") ON DELETE CASCADE,
  "description"           TEXT NOT NULL,
  "standalone_price_satang" BIGINT NOT NULL DEFAULT 0,
  "allocation_satang"     BIGINT NOT NULL DEFAULT 0,
  "satisfaction_method"   TEXT NOT NULL DEFAULT 'point_in_time'
    CHECK ("satisfaction_method" IN ('point_in_time', 'over_time')),
  "progress_percent"      INTEGER NOT NULL DEFAULT 0
    CHECK ("progress_percent" >= 0 AND "progress_percent" <= 100),
  "recognized_satang"     BIGINT NOT NULL DEFAULT 0,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_perf_obligations_contract"
  ON "performance_obligations" ("contract_id");

-- ---------------------------------------------------------------------------
-- 4. Deferred Tax Calculation
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "deferred_tax_items" (
  "id"                            TEXT PRIMARY KEY,
  "description"                   TEXT NOT NULL,
  "tax_base_satang"               BIGINT NOT NULL DEFAULT 0,
  "accounting_base_satang"        BIGINT NOT NULL DEFAULT 0,
  "temporary_difference_satang"   BIGINT NOT NULL DEFAULT 0,
  "deferred_tax_asset_satang"     BIGINT NOT NULL DEFAULT 0,
  "deferred_tax_liability_satang" BIGINT NOT NULL DEFAULT 0,
  "tax_rate_bp"                   INTEGER NOT NULL DEFAULT 2000,
  "tenant_id"                     TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by"                    TEXT NOT NULL,
  "created_at"                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_deferred_tax_items_tenant"
  ON "deferred_tax_items" ("tenant_id");

ALTER TABLE "deferred_tax_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deferred_tax_items_tenant_isolation" ON "deferred_tax_items";
CREATE POLICY "deferred_tax_items_tenant_isolation"
  ON "deferred_tax_items"
  USING (tenant_id = current_setting('app.tenant_id', TRUE));

-- ---------------------------------------------------------------------------
-- 5. Permissions
-- ---------------------------------------------------------------------------

INSERT INTO permissions (id, name, description) VALUES
  -- IFRS 16 Lease Accounting
  ('fi:lease:create', 'fi:lease:create', 'Create lease contracts'),
  ('fi:lease:read', 'fi:lease:read', 'View lease contracts'),
  ('fi:lease:update', 'fi:lease:update', 'Update lease contracts'),
  -- Parallel Accounting
  ('gl:parallel:create', 'gl:parallel:create', 'Create parallel ledger entries'),
  ('gl:parallel:read', 'gl:parallel:read', 'Read parallel ledger entries'),
  -- e-Tax Invoice
  ('ar:etax:generate', 'ar:etax:generate', 'Generate e-Tax Invoice XML'),
  -- Revenue Recognition (IFRS 15)
  ('rev:contract:create', 'rev:contract:create', 'Create revenue contracts'),
  ('rev:contract:read', 'rev:contract:read', 'View revenue contracts'),
  ('rev:contract:update', 'rev:contract:update', 'Update revenue contracts'),
  ('rev:recognize', 'rev:recognize', 'Recognize revenue'),
  -- e-WHT Filing
  ('fi:wht:efile', 'fi:wht:efile', 'Generate e-WHT filing data'),
  -- Deferred Tax
  ('tax:deferred:create', 'tax:deferred:create', 'Create deferred tax items'),
  ('tax:deferred:read', 'tax:deferred:read', 'View deferred tax items'),
  ('tax:deferred:update', 'tax:deferred:update', 'Update deferred tax items'),
  -- Bank Payment Files
  ('ap:bank-file:generate', 'ap:bank-file:generate', 'Generate bank payment files')
ON CONFLICT (id) DO NOTHING;
