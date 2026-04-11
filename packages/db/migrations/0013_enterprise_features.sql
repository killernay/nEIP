-- 0009_enterprise_features.sql
-- Phase 5: Enterprise features
-- Multi-currency, Multi-company, Approval chains, Vendor returns, Batch/Serial, Bank matching, Cash flow

-- ---------------------------------------------------------------------------
-- 5.1 Multi-Currency Support
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS currencies (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,           -- ISO 4217: USD, EUR, THB
  name        TEXT NOT NULL,
  symbol      TEXT NOT NULL DEFAULT '',
  decimal_places INTEGER NOT NULL DEFAULT 2,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency   TEXT NOT NULL,
  to_currency     TEXT NOT NULL,
  rate            NUMERIC(18,6) NOT NULL,
  effective_date  DATE NOT NULL,
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'bot')),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency, effective_date, tenant_id)
);

-- Add currency fields to invoices (AR)
DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'THB';
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1.000000;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS local_amount_satang BIGINT NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Add currency fields to bills (AP)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'THB';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1.000000;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS local_amount_satang BIGINT NOT NULL DEFAULT 0;

-- Add currency fields to bill_payments
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'THB';
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1.000000;
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS local_amount_satang BIGINT NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 5.2 Multi-Company / Branch
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS companies (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  tax_id            TEXT,
  is_branch         BOOLEAN NOT NULL DEFAULT false,
  parent_company_id TEXT REFERENCES companies(id),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Add company_id to key tables (nullable for backwards compatibility)
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id);
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id);

DO $$ BEGIN
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 5.3 Approval Chains
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS approval_workflows (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type   TEXT NOT NULL,  -- 'purchase_order', 'journal_entry', 'bill_payment', etc.
  name            TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id             TEXT NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  step_order              INTEGER NOT NULL,
  approver_role           TEXT NOT NULL,
  amount_threshold_satang BIGINT NOT NULL DEFAULT 0,
  auto_escalate_hours     INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, step_order)
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     TEXT NOT NULL,
  document_type   TEXT NOT NULL,
  workflow_id     TEXT NOT NULL REFERENCES approval_workflows(id),
  current_step    INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delegated')),
  submitted_by    TEXT NOT NULL,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_actions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  step        INTEGER NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'delegate')),
  actor_id    TEXT NOT NULL,
  delegate_to TEXT,
  comment     TEXT,
  acted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5.4 Vendor Returns
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vendor_returns (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   TEXT NOT NULL REFERENCES vendors(id),
  po_id       TEXT REFERENCES purchase_orders(id),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'shipped', 'received_credit')),
  reason      TEXT,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_return_lines (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_return_id    TEXT NOT NULL REFERENCES vendor_returns(id) ON DELETE CASCADE,
  product_id          TEXT NOT NULL REFERENCES products(id),
  quantity            INTEGER NOT NULL,
  unit_price_satang   BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5.5 Batch / Serial Tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS batches (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        TEXT NOT NULL REFERENCES products(id),
  batch_number      TEXT NOT NULL,
  manufacture_date  DATE,
  expiry_date       DATE,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, batch_number, tenant_id)
);

CREATE TABLE IF NOT EXISTS serial_numbers (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      TEXT NOT NULL REFERENCES products(id),
  serial_number   TEXT NOT NULL,
  batch_id        TEXT REFERENCES batches(id),
  status          TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'returned')),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, serial_number, tenant_id)
);

-- Add batch/serial tracking to stock_movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES batches(id);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS serial_number_id TEXT REFERENCES serial_numbers(id);

-- ---------------------------------------------------------------------------
-- 5.6 Bank Auto-Matching Rules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bank_matching_rules (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  priority          INTEGER NOT NULL DEFAULT 0,
  match_type        TEXT NOT NULL CHECK (match_type IN ('exact_amount', 'reference', 'amount_range')),
  field             TEXT NOT NULL DEFAULT 'description',
  pattern           TEXT NOT NULL,
  min_amount_satang BIGINT,
  max_amount_satang BIGINT,
  target_account_id TEXT NOT NULL,
  tenant_id         TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(from_currency, to_currency, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_doc ON approval_requests(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_returns_vendor ON vendor_returns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_product ON serial_numbers(product_id);
CREATE INDEX IF NOT EXISTS idx_bank_matching_rules_tenant ON bank_matching_rules(tenant_id, priority);
