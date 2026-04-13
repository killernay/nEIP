-- Migration 0019: Import/Export & Foreign Trade module
-- Tables: incoterms, trade_declarations, trade_declaration_lines, letters_of_credit, landed_costs

-- ---------------------------------------------------------------------------
-- 1. Incoterms — International Commercial Terms reference data
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS incoterms (
  id                  TEXT PRIMARY KEY,
  code                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT,
  risk_transfer_point TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 7 standard Incoterms 2020
INSERT INTO incoterms (id, code, name, description, risk_transfer_point) VALUES
  ('inco_exw', 'EXW', 'Ex Works', 'Seller makes goods available at their premises. Buyer bears all costs and risks.', 'Seller premises'),
  ('inco_fca', 'FCA', 'Free Carrier', 'Seller delivers goods to carrier nominated by buyer at named place.', 'Named place of delivery'),
  ('inco_fob', 'FOB', 'Free On Board', 'Seller delivers goods on board the vessel at the named port of shipment.', 'On board vessel at port of shipment'),
  ('inco_cfr', 'CFR', 'Cost and Freight', 'Seller pays costs and freight to bring goods to port of destination. Risk transfers when goods are on board.', 'On board vessel at port of shipment'),
  ('inco_cif', 'CIF', 'Cost, Insurance and Freight', 'Like CFR but seller also procures insurance for buyer. Risk transfers when goods are on board.', 'On board vessel at port of shipment'),
  ('inco_dap', 'DAP', 'Delivered At Place', 'Seller delivers goods at the named place of destination, ready for unloading.', 'Named place of destination'),
  ('inco_ddp', 'DDP', 'Delivered Duty Paid', 'Seller delivers goods cleared for import at the named place of destination. Seller bears all costs and risks.', 'Named place of destination')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Trade Declarations — Customs import/export declarations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trade_declarations (
  id                      TEXT PRIMARY KEY,
  document_number         TEXT NOT NULL,
  type                    TEXT NOT NULL CHECK (type IN ('import', 'export')),
  customs_date            TEXT NOT NULL,  -- YYYY-MM-DD
  reference_type          TEXT CHECK (reference_type IN ('po', 'so')),
  reference_id            TEXT,
  incoterm_code           TEXT REFERENCES incoterms(code),
  country_of_origin       TEXT,
  country_of_destination  TEXT,
  port_of_loading         TEXT,
  port_of_discharge       TEXT,
  vessel_name             TEXT,
  status                  TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'submitted', 'inspecting', 'cleared', 'rejected')),
  currency_code           TEXT NOT NULL DEFAULT 'THB',
  exchange_rate           NUMERIC(18,6) NOT NULL DEFAULT 1.0,
  total_value_satang      BIGINT NOT NULL DEFAULT 0,
  total_duty_satang       BIGINT NOT NULL DEFAULT 0,
  customs_broker          TEXT,
  tenant_id               TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by              TEXT NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_declarations_tenant ON trade_declarations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trade_declarations_status ON trade_declarations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_declarations_type ON trade_declarations(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_trade_declarations_doc_num ON trade_declarations(document_number);

-- ---------------------------------------------------------------------------
-- 3. Trade Declaration Lines — Line items on a customs declaration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trade_declaration_lines (
  id                    TEXT PRIMARY KEY,
  declaration_id        TEXT NOT NULL REFERENCES trade_declarations(id) ON DELETE CASCADE,
  product_id            TEXT REFERENCES products(id),
  hs_code               TEXT,
  description           TEXT,
  quantity              NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit                  TEXT NOT NULL DEFAULT 'PCS',
  unit_value_satang     BIGINT NOT NULL DEFAULT 0,
  customs_duty_rate_bp  INTEGER NOT NULL DEFAULT 0,  -- basis points (1 bp = 0.01%)
  customs_duty_satang   BIGINT NOT NULL DEFAULT 0,
  excise_rate_bp        INTEGER NOT NULL DEFAULT 0,
  excise_satang         BIGINT NOT NULL DEFAULT 0,
  vat_satang            BIGINT NOT NULL DEFAULT 0,
  tenant_id             TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trade_decl_lines_declaration ON trade_declaration_lines(declaration_id);
CREATE INDEX IF NOT EXISTS idx_trade_decl_lines_product ON trade_declaration_lines(product_id);

-- ---------------------------------------------------------------------------
-- 4. Letters of Credit — Import/Export LC management
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS letters_of_credit (
  id                  TEXT PRIMARY KEY,
  lc_number           TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('import', 'export')),
  issuing_bank        TEXT NOT NULL,
  advising_bank       TEXT,
  beneficiary         TEXT NOT NULL,
  applicant           TEXT NOT NULL,
  amount_satang       BIGINT NOT NULL DEFAULT 0,
  currency_code       TEXT NOT NULL DEFAULT 'THB',
  issue_date          TEXT NOT NULL,  -- YYYY-MM-DD
  expiry_date         TEXT NOT NULL,  -- YYYY-MM-DD
  shipment_deadline   TEXT,           -- YYYY-MM-DD
  reference_type      TEXT CHECK (reference_type IN ('po', 'so')),
  reference_id        TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'applied', 'issued', 'amended', 'negotiated', 'settled', 'expired', 'cancelled')),
  terms               TEXT,
  documents_required  JSONB DEFAULT '[]'::jsonb,
  tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_letters_of_credit_tenant ON letters_of_credit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_status ON letters_of_credit(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_letters_of_credit_lc_num ON letters_of_credit(lc_number);

-- ---------------------------------------------------------------------------
-- 5. Landed Costs — Full cost calculation for imported goods
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS landed_costs (
  id                      TEXT PRIMARY KEY,
  po_id                   TEXT NOT NULL REFERENCES purchase_orders(id),
  product_id              TEXT NOT NULL REFERENCES products(id),
  purchase_price_satang   BIGINT NOT NULL DEFAULT 0,
  freight_satang          BIGINT NOT NULL DEFAULT 0,
  insurance_satang        BIGINT NOT NULL DEFAULT 0,
  customs_duty_satang     BIGINT NOT NULL DEFAULT 0,
  excise_satang           BIGINT NOT NULL DEFAULT 0,
  handling_satang         BIGINT NOT NULL DEFAULT 0,
  other_satang            BIGINT NOT NULL DEFAULT 0,
  total_landed_satang     BIGINT NOT NULL DEFAULT 0,
  cost_per_unit_satang    BIGINT NOT NULL DEFAULT 0,
  tenant_id               TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landed_costs_po ON landed_costs(po_id);
CREATE INDEX IF NOT EXISTS idx_landed_costs_product ON landed_costs(product_id);
CREATE INDEX IF NOT EXISTS idx_landed_costs_tenant ON landed_costs(tenant_id);

-- ---------------------------------------------------------------------------
-- 6. Permissions — Foreign Trade module
-- ---------------------------------------------------------------------------

INSERT INTO permissions (id, name, description) VALUES
  ('perm_ft_declaration_create', 'ft:declaration:create', 'Create trade declaration'),
  ('perm_ft_declaration_read',   'ft:declaration:read',   'View trade declarations'),
  ('perm_ft_declaration_update', 'ft:declaration:update', 'Update trade declaration'),
  ('perm_ft_declaration_delete', 'ft:declaration:delete', 'Delete trade declaration'),
  ('perm_ft_declaration_submit', 'ft:declaration:submit', 'Submit declaration to customs'),
  ('perm_ft_declaration_clear',  'ft:declaration:clear',  'Clear customs declaration'),
  ('perm_ft_lc_create',          'ft:lc:create',          'Create letter of credit'),
  ('perm_ft_lc_read',            'ft:lc:read',            'View letters of credit'),
  ('perm_ft_lc_update',          'ft:lc:update',          'Update letter of credit'),
  ('perm_ft_lc_delete',          'ft:lc:delete',          'Delete letter of credit'),
  ('perm_ft_lc_issue',           'ft:lc:issue',           'Issue letter of credit'),
  ('perm_ft_lc_negotiate',       'ft:lc:negotiate',       'Negotiate letter of credit'),
  ('perm_ft_lc_settle',          'ft:lc:settle',          'Settle letter of credit'),
  ('perm_ft_lc_cancel',          'ft:lc:cancel',          'Cancel letter of credit'),
  ('perm_ft_landed_create',      'ft:landed:create',      'Calculate landed cost'),
  ('perm_ft_landed_read',        'ft:landed:read',        'View landed costs')
ON CONFLICT (id) DO NOTHING;
