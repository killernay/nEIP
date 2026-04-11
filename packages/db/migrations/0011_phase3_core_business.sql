-- Phase 3: Core Business — Pricing, Payment Terms, Dunning, 3-Way Matching,
-- Recurring JE, Credit Management
-- Migration 0009

-- ---------------------------------------------------------------------------
-- 3.1 Price Lists
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS price_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'THB',
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_list_items (
  id TEXT PRIMARY KEY,
  price_list_id TEXT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_price_satang BIGINT NOT NULL DEFAULT 0,
  min_quantity REAL NOT NULL DEFAULT 1,
  discount_percent REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer-specific price list assignment
CREATE TABLE IF NOT EXISTS customer_price_lists (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  price_list_id TEXT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE (contact_id, price_list_id)
);

-- ---------------------------------------------------------------------------
-- 3.2 Payment Terms
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_terms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 30,
  discount_percent REAL NOT NULL DEFAULT 0,
  discount_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code, tenant_id)
);

-- Add payment_terms_id to contacts (default terms per customer/vendor)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS payment_terms_id TEXT REFERENCES payment_terms(id);

-- ---------------------------------------------------------------------------
-- 3.3 Dunning
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dunning_levels (
  id TEXT PRIMARY KEY,
  level INTEGER NOT NULL,
  days_overdue INTEGER NOT NULL,
  template TEXT NOT NULL DEFAULT '',
  fee_satang BIGINT NOT NULL DEFAULT 0,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (level, tenant_id)
);

CREATE TABLE IF NOT EXISTS dunning_history (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  contact_id TEXT,
  level INTEGER NOT NULL,
  fee_satang BIGINT NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3.4 3-Way Matching — add match_status to bills
-- ---------------------------------------------------------------------------

ALTER TABLE bills ADD COLUMN IF NOT EXISTS match_status TEXT DEFAULT 'pending';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS purchase_order_id TEXT;

-- ---------------------------------------------------------------------------
-- 3.5 Recurring Journal Entry Templates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS recurring_je_templates (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  next_run_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3.6 Credit Management — credit_limit_satang already exists on contacts
-- Add credit_check_mode to tenants for configurable behavior
-- ---------------------------------------------------------------------------

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS credit_check_mode TEXT DEFAULT 'warn_only';
