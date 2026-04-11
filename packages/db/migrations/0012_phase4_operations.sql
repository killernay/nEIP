-- 0009_phase4_operations.sql
-- Phase 4: Operations — PR, RFQ, Stock Count, HR Org/Positions, Attendance,
--                        Leave Enhancements, Payroll Enhancements, CO Budget Control

-- ---------------------------------------------------------------------------
-- 4.1 Purchase Requisitions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id            TEXT PRIMARY KEY,
  document_number TEXT NOT NULL,
  requester_id  TEXT NOT NULL,
  department_id TEXT REFERENCES departments(id),
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','pending','approved','rejected','converted')),
  notes         TEXT,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by    TEXT,
  approved_by   TEXT,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pr_lines (
  id                      TEXT PRIMARY KEY,
  purchase_requisition_id TEXT NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  line_number             INTEGER NOT NULL,
  product_id              TEXT,
  description             TEXT NOT NULL,
  quantity                NUMERIC NOT NULL,
  estimated_price_satang  BIGINT NOT NULL DEFAULT 0,
  amount_satang           BIGINT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4.2 RFQ (Request for Quotation)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rfqs (
  id            TEXT PRIMARY KEY,
  document_number TEXT NOT NULL,
  pr_id         TEXT REFERENCES purchase_requisitions(id),
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','sent','received','closed')),
  notes         TEXT,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfq_vendors (
  id                  TEXT PRIMARY KEY,
  rfq_id              TEXT NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  vendor_id           TEXT NOT NULL REFERENCES vendors(id),
  response_date       DATE,
  total_amount_satang BIGINT DEFAULT 0,
  selected            BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4.3 Physical Inventory / Stock Count
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_counts (
  id            TEXT PRIMARY KEY,
  document_number TEXT NOT NULL,
  warehouse_id  TEXT NOT NULL REFERENCES warehouses(id),
  count_date    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','counting','posted')),
  notes         TEXT,
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by    TEXT,
  posted_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_count_lines (
  id              TEXT PRIMARY KEY,
  stock_count_id  TEXT NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  product_id      TEXT NOT NULL,
  book_quantity   INTEGER NOT NULL DEFAULT 0,
  actual_quantity INTEGER,
  variance        INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4.4 HR Org Hierarchy + Position Management
-- ---------------------------------------------------------------------------

-- Add parent_id to departments for hierarchy
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES departments(id);

CREATE TABLE IF NOT EXISTS positions (
  id                      TEXT PRIMARY KEY,
  code                    TEXT NOT NULL,
  title                   TEXT NOT NULL,
  department_id           TEXT REFERENCES departments(id),
  reports_to_position_id  TEXT REFERENCES positions(id),
  headcount               INTEGER NOT NULL DEFAULT 1,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  tenant_id               TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add position_id to employees (keep position text column for backward compat)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS position_id TEXT REFERENCES positions(id);

-- ---------------------------------------------------------------------------
-- 4.5 HR Attendance Tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance_records (
  id              TEXT PRIMARY KEY,
  employee_id     TEXT NOT NULL REFERENCES employees(id),
  date            DATE NOT NULL,
  clock_in        TIMESTAMPTZ,
  clock_out       TIMESTAMPTZ,
  hours_worked    NUMERIC(5,2) DEFAULT 0,
  overtime_hours  NUMERIC(5,2) DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'present'
                  CHECK (status IN ('present','absent','late','leave')),
  notes           TEXT,
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ---------------------------------------------------------------------------
-- 4.8 Leave Management Enhancement
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS leave_accrual_rules (
  id                  TEXT PRIMARY KEY,
  leave_type_id       TEXT NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  accrual_per_month   NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_carry_forward   INTEGER NOT NULL DEFAULT 0,
  probation_months    INTEGER NOT NULL DEFAULT 0,
  tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_holidays (
  id        TEXT PRIMARY KEY,
  date      DATE NOT NULL,
  name_th   TEXT NOT NULL,
  name_en   TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, date)
);

-- ---------------------------------------------------------------------------
-- 4.9 CO Budget Control — add cost_center_id to budgets for CC-level budgets
-- ---------------------------------------------------------------------------

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS cost_center_id TEXT REFERENCES cost_centers(id);
