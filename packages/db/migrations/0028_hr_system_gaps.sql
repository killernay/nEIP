-- ============================================================
-- Migration: 0028_hr_system_gaps
-- Description: HR Self-Service (ESS/MSS), Travel Expense, Recruitment,
--              Performance, Compensation, Benefits, Shift Scheduling,
--              GRC/SoD, Business Partner, DMS, EDI, Archiving, MDG
-- Created: 2026-04-13
-- ============================================================

-- =========================================================================
-- SECTION 1: Travel Expense Management
-- =========================================================================

CREATE TABLE IF NOT EXISTS "travel_requests" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employee_id"           TEXT NOT NULL REFERENCES "employees"("id"),
  "destination"           TEXT NOT NULL,
  "purpose"               TEXT NOT NULL,
  "departure_date"        DATE NOT NULL,
  "return_date"           DATE NOT NULL,
  "estimated_cost_satang" BIGINT NOT NULL DEFAULT 0,
  "advance_amount_satang" BIGINT NOT NULL DEFAULT 0,
  "status"                TEXT NOT NULL DEFAULT 'draft'
    CHECK ("status" IN ('draft','submitted','approved','rejected','settled')),
  "approved_by"           TEXT,
  "tenant_id"             TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_travel_requests_tenant"
  ON "travel_requests" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_travel_requests_employee"
  ON "travel_requests" ("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "idx_travel_requests_status"
  ON "travel_requests" ("tenant_id", "status");

ALTER TABLE "travel_requests" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "travel_requests_tenant_isolation" ON "travel_requests";
CREATE POLICY "travel_requests_tenant_isolation"
  ON "travel_requests" USING ("tenant_id" = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS "expense_claims" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "travel_request_id"   TEXT REFERENCES "travel_requests"("id"),
  "employee_id"         TEXT NOT NULL REFERENCES "employees"("id"),
  "total_amount_satang" BIGINT NOT NULL DEFAULT 0,
  "status"              TEXT NOT NULL DEFAULT 'draft'
    CHECK ("status" IN ('draft','submitted','approved','paid')),
  "approved_by"         TEXT,
  "tenant_id"           TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_expense_claims_tenant"
  ON "expense_claims" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_expense_claims_employee"
  ON "expense_claims" ("tenant_id", "employee_id");

ALTER TABLE "expense_claims" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_claims_tenant_isolation" ON "expense_claims";
CREATE POLICY "expense_claims_tenant_isolation"
  ON "expense_claims" USING ("tenant_id" = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS "expense_lines" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "claim_id"       TEXT NOT NULL REFERENCES "expense_claims"("id") ON DELETE CASCADE,
  "date"           DATE NOT NULL,
  "category"       TEXT NOT NULL DEFAULT 'other'
    CHECK ("category" IN ('transport','hotel','meals','other')),
  "description"    TEXT,
  "amount_satang"  BIGINT NOT NULL DEFAULT 0,
  "receipt_number" TEXT,
  "vat_satang"     BIGINT NOT NULL DEFAULT 0,
  "tenant_id"      TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_expense_lines_claim"
  ON "expense_lines" ("claim_id");

ALTER TABLE "expense_lines" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_lines_tenant_isolation" ON "expense_lines";
CREATE POLICY "expense_lines_tenant_isolation"
  ON "expense_lines" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 2: Recruitment / ATS
-- =========================================================================

CREATE TABLE IF NOT EXISTS "job_postings" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title"         TEXT NOT NULL,
  "department_id" TEXT REFERENCES "departments"("id"),
  "position_id"   TEXT REFERENCES "positions"("id"),
  "description"   TEXT,
  "requirements"  TEXT,
  "status"        TEXT NOT NULL DEFAULT 'draft'
    CHECK ("status" IN ('draft','open','closed')),
  "tenant_id"     TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_job_postings_tenant"
  ON "job_postings" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_job_postings_status"
  ON "job_postings" ("tenant_id", "status");

ALTER TABLE "job_postings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_postings_tenant_isolation" ON "job_postings";
CREATE POLICY "job_postings_tenant_isolation"
  ON "job_postings" USING ("tenant_id" = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS "job_applications" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "posting_id"     TEXT NOT NULL REFERENCES "job_postings"("id") ON DELETE CASCADE,
  "applicant_name" TEXT NOT NULL,
  "email"          TEXT,
  "phone"          TEXT,
  "resume_url"     TEXT,
  "status"         TEXT NOT NULL DEFAULT 'received'
    CHECK ("status" IN ('received','screening','interview','offered','hired','rejected')),
  "notes"          TEXT,
  "tenant_id"      TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_job_applications_posting"
  ON "job_applications" ("posting_id");
CREATE INDEX IF NOT EXISTS "idx_job_applications_status"
  ON "job_applications" ("tenant_id", "status");

ALTER TABLE "job_applications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "job_applications_tenant_isolation" ON "job_applications";
CREATE POLICY "job_applications_tenant_isolation"
  ON "job_applications" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 3: Performance & Goals
-- =========================================================================

CREATE TABLE IF NOT EXISTS "performance_reviews" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employee_id"     TEXT NOT NULL REFERENCES "employees"("id"),
  "reviewer_id"     TEXT NOT NULL REFERENCES "employees"("id"),
  "review_period"   TEXT NOT NULL,
  "overall_rating"  NUMERIC(3,1),
  "comments"        TEXT,
  "status"          TEXT NOT NULL DEFAULT 'draft'
    CHECK ("status" IN ('draft','self_review','manager_review','completed')),
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_performance_reviews_tenant"
  ON "performance_reviews" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_performance_reviews_employee"
  ON "performance_reviews" ("tenant_id", "employee_id");

ALTER TABLE "performance_reviews" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "performance_reviews_tenant_isolation" ON "performance_reviews";
CREATE POLICY "performance_reviews_tenant_isolation"
  ON "performance_reviews" USING ("tenant_id" = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS "performance_goals" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "review_id"        TEXT NOT NULL REFERENCES "performance_reviews"("id") ON DELETE CASCADE,
  "goal_description" TEXT NOT NULL,
  "target"           TEXT,
  "actual"           TEXT,
  "weight_percent"   NUMERIC(5,2) DEFAULT 0,
  "rating"           NUMERIC(3,1),
  "tenant_id"        TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_performance_goals_review"
  ON "performance_goals" ("review_id");

ALTER TABLE "performance_goals" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "performance_goals_tenant_isolation" ON "performance_goals";
CREATE POLICY "performance_goals_tenant_isolation"
  ON "performance_goals" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 4: Compensation Management
-- =========================================================================

CREATE TABLE IF NOT EXISTS "compensation_changes" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employee_id"       TEXT NOT NULL REFERENCES "employees"("id"),
  "change_type"       TEXT NOT NULL
    CHECK ("change_type" IN ('merit','promotion','adjustment','bonus')),
  "effective_date"    DATE NOT NULL,
  "old_salary_satang" BIGINT,
  "new_salary_satang" BIGINT NOT NULL,
  "reason"            TEXT,
  "status"            TEXT NOT NULL DEFAULT 'pending'
    CHECK ("status" IN ('pending','approved','rejected')),
  "approved_by"       TEXT,
  "tenant_id"         TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_compensation_changes_tenant"
  ON "compensation_changes" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_compensation_changes_employee"
  ON "compensation_changes" ("tenant_id", "employee_id");

ALTER TABLE "compensation_changes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compensation_changes_tenant_isolation" ON "compensation_changes";
CREATE POLICY "compensation_changes_tenant_isolation"
  ON "compensation_changes" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 5: Benefits Administration
-- =========================================================================

CREATE TABLE IF NOT EXISTS "employee_benefits" (
  "id"                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employee_id"                 TEXT NOT NULL REFERENCES "employees"("id"),
  "benefit_type"                TEXT NOT NULL
    CHECK ("benefit_type" IN ('health_insurance','life_insurance','provident_fund','dental','other')),
  "provider"                    TEXT,
  "policy_number"               TEXT,
  "coverage_amount_satang"      BIGINT DEFAULT 0,
  "employer_contribution_satang" BIGINT DEFAULT 0,
  "employee_contribution_satang" BIGINT DEFAULT 0,
  "start_date"                  DATE NOT NULL,
  "end_date"                    DATE,
  "tenant_id"                   TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_employee_benefits_tenant"
  ON "employee_benefits" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_employee_benefits_employee"
  ON "employee_benefits" ("tenant_id", "employee_id");

ALTER TABLE "employee_benefits" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_benefits_tenant_isolation" ON "employee_benefits";
CREATE POLICY "employee_benefits_tenant_isolation"
  ON "employee_benefits" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 6: Shift Scheduling
-- =========================================================================

CREATE TABLE IF NOT EXISTS "shift_definitions" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"          TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "start_time"    TIME NOT NULL,
  "end_time"      TIME NOT NULL,
  "break_minutes" INTEGER NOT NULL DEFAULT 60,
  "is_night_shift" BOOLEAN NOT NULL DEFAULT FALSE,
  "tenant_id"     TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("code", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_shift_definitions_tenant"
  ON "shift_definitions" ("tenant_id");

ALTER TABLE "shift_definitions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shift_definitions_tenant_isolation" ON "shift_definitions";
CREATE POLICY "shift_definitions_tenant_isolation"
  ON "shift_definitions" USING ("tenant_id" = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS "employee_shifts" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "employee_id" TEXT NOT NULL REFERENCES "employees"("id"),
  "date"        DATE NOT NULL,
  "shift_id"    TEXT NOT NULL REFERENCES "shift_definitions"("id"),
  "tenant_id"   TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("employee_id", "date", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_employee_shifts_tenant"
  ON "employee_shifts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_employee_shifts_employee_date"
  ON "employee_shifts" ("tenant_id", "employee_id", "date");

ALTER TABLE "employee_shifts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_shifts_tenant_isolation" ON "employee_shifts";
CREATE POLICY "employee_shifts_tenant_isolation"
  ON "employee_shifts" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 7: GRC Access Control (SoD)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "sod_rules" (
  "id"                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "rule_name"                TEXT NOT NULL,
  "conflicting_permission_a" TEXT NOT NULL,
  "conflicting_permission_b" TEXT NOT NULL,
  "risk_level"               TEXT NOT NULL DEFAULT 'medium'
    CHECK ("risk_level" IN ('high','medium','low')),
  "tenant_id"                TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("conflicting_permission_a", "conflicting_permission_b", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_sod_rules_tenant"
  ON "sod_rules" ("tenant_id");

ALTER TABLE "sod_rules" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sod_rules_tenant_isolation" ON "sod_rules";
CREATE POLICY "sod_rules_tenant_isolation"
  ON "sod_rules" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 8: Business Partner (unified contact)
-- =========================================================================

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "is_customer" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "is_vendor"   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "is_employee" BOOLEAN NOT NULL DEFAULT FALSE;

-- Back-fill existing contacts based on contact_type
UPDATE "contacts" SET "is_customer" = TRUE WHERE "contact_type" IN ('customer','both') AND "is_customer" = FALSE;
UPDATE "contacts" SET "is_vendor"   = TRUE WHERE "contact_type" IN ('vendor','both')   AND "is_vendor"   = FALSE;

-- =========================================================================
-- SECTION 9: Document Management System (DMS)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "document_attachments" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entity_type"  TEXT NOT NULL
    CHECK ("entity_type" IN ('invoice','bill','po','project','employee','asset','travel_request','expense_claim')),
  "entity_id"    TEXT NOT NULL,
  "file_name"    TEXT NOT NULL,
  "file_type"    TEXT,
  "file_size"    BIGINT DEFAULT 0,
  "storage_path" TEXT NOT NULL,
  "version"      INTEGER NOT NULL DEFAULT 1,
  "uploaded_by"  TEXT,
  "tenant_id"    TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_document_attachments_tenant"
  ON "document_attachments" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_document_attachments_entity"
  ON "document_attachments" ("tenant_id", "entity_type", "entity_id");

ALTER TABLE "document_attachments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "document_attachments_tenant_isolation" ON "document_attachments";
CREATE POLICY "document_attachments_tenant_isolation"
  ON "document_attachments" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 10: EDI (Electronic Data Interchange)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "edi_messages" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "message_type"  TEXT NOT NULL
    CHECK ("message_type" IN ('ORDERS','INVOIC','DESADV')),
  "direction"     TEXT NOT NULL
    CHECK ("direction" IN ('inbound','outbound')),
  "partner_id"    TEXT REFERENCES "contacts"("id"),
  "status"        TEXT NOT NULL DEFAULT 'received'
    CHECK ("status" IN ('received','processed','error')),
  "content"       JSONB NOT NULL DEFAULT '{}',
  "error_message" TEXT,
  "tenant_id"     TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_edi_messages_tenant"
  ON "edi_messages" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_edi_messages_status"
  ON "edi_messages" ("tenant_id", "status");

ALTER TABLE "edi_messages" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "edi_messages_tenant_isolation" ON "edi_messages";
CREATE POLICY "edi_messages_tenant_isolation"
  ON "edi_messages" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 11: Data Archiving / Retention
-- =========================================================================

CREATE TABLE IF NOT EXISTS "archive_policies" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entity_type"     TEXT NOT NULL,
  "retention_years" INTEGER NOT NULL DEFAULT 7,
  "is_active"       BOOLEAN NOT NULL DEFAULT TRUE,
  "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("entity_type", "tenant_id")
);

CREATE INDEX IF NOT EXISTS "idx_archive_policies_tenant"
  ON "archive_policies" ("tenant_id");

ALTER TABLE "archive_policies" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "archive_policies_tenant_isolation" ON "archive_policies";
CREATE POLICY "archive_policies_tenant_isolation"
  ON "archive_policies" USING ("tenant_id" = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS "archived_records" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entity_type"       TEXT NOT NULL,
  "entity_id"         TEXT NOT NULL,
  "archived_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "archive_policy_id" TEXT REFERENCES "archive_policies"("id"),
  "data"              JSONB NOT NULL DEFAULT '{}',
  "tenant_id"         TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_archived_records_tenant"
  ON "archived_records" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_archived_records_entity"
  ON "archived_records" ("tenant_id", "entity_type", "entity_id");

ALTER TABLE "archived_records" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "archived_records_tenant_isolation" ON "archived_records";
CREATE POLICY "archived_records_tenant_isolation"
  ON "archived_records" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 12: Master Data Governance (MDG)
-- =========================================================================

CREATE TABLE IF NOT EXISTS "mdg_change_requests" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entity_type"   TEXT NOT NULL
    CHECK ("entity_type" IN ('product','contact','account')),
  "entity_id"     TEXT,
  "change_type"   TEXT NOT NULL
    CHECK ("change_type" IN ('create','update','delete')),
  "proposed_data" JSONB NOT NULL DEFAULT '{}',
  "status"        TEXT NOT NULL DEFAULT 'pending'
    CHECK ("status" IN ('pending','approved','rejected')),
  "requested_by"  TEXT,
  "approved_by"   TEXT,
  "tenant_id"     TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_mdg_change_requests_tenant"
  ON "mdg_change_requests" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_mdg_change_requests_status"
  ON "mdg_change_requests" ("tenant_id", "status");

ALTER TABLE "mdg_change_requests" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mdg_change_requests_tenant_isolation" ON "mdg_change_requests";
CREATE POLICY "mdg_change_requests_tenant_isolation"
  ON "mdg_change_requests" USING ("tenant_id" = current_setting('app.tenant_id', true));

-- =========================================================================
-- SECTION 13: Updated-at triggers for new tables
-- =========================================================================

CREATE OR REPLACE FUNCTION update_hr_system_gaps_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'travel_requests','expense_claims','job_postings','job_applications',
    'performance_reviews','compensation_changes','employee_benefits',
    'shift_definitions','sod_rules','edi_messages','archive_policies',
    'mdg_change_requests'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_hr_system_gaps_updated_at()', t, t);
  END LOOP;
END $$;

-- =========================================================================
-- SECTION 14: Permissions
-- =========================================================================

INSERT INTO permissions (id, name, description) VALUES
  -- ESS (Employee Self-Service)
  ('ess:profile:read',     'ess:profile:read',     'View own profile'),
  ('ess:profile:update',   'ess:profile:update',   'Update own profile'),
  ('ess:payslip:read',     'ess:payslip:read',     'View own payslips'),
  ('ess:leave:read',       'ess:leave:read',       'View own leave balance'),
  ('ess:leave:request',    'ess:leave:request',    'Submit own leave request'),
  ('ess:attendance:read',  'ess:attendance:read',  'View own attendance'),
  -- MSS (Manager Self-Service)
  ('mss:team:read',        'mss:team:read',        'View direct reports'),
  ('mss:approval:manage',  'mss:approval:manage',  'Approve/reject team requests'),
  -- Travel & Expense
  ('hr:travel:create',     'hr:travel:create',     'Create travel request'),
  ('hr:travel:read',       'hr:travel:read',       'View travel requests'),
  ('hr:travel:approve',    'hr:travel:approve',    'Approve travel requests'),
  ('hr:expense:create',    'hr:expense:create',    'Create expense claim'),
  ('hr:expense:read',      'hr:expense:read',      'View expense claims'),
  ('hr:expense:approve',   'hr:expense:approve',   'Approve expense claims'),
  -- Recruitment / ATS
  ('hr:recruitment:create','hr:recruitment:create', 'Create job postings'),
  ('hr:recruitment:read',  'hr:recruitment:read',   'View job postings'),
  ('hr:recruitment:update','hr:recruitment:update', 'Update job postings'),
  ('hr:recruitment:manage','hr:recruitment:manage', 'Manage applications'),
  -- Performance
  ('hr:performance:create','hr:performance:create', 'Create performance reviews'),
  ('hr:performance:read',  'hr:performance:read',   'View performance reviews'),
  ('hr:performance:update','hr:performance:update', 'Update performance reviews'),
  -- Compensation
  ('hr:compensation:create','hr:compensation:create','Propose compensation changes'),
  ('hr:compensation:read',  'hr:compensation:read',  'View compensation data'),
  ('hr:compensation:approve','hr:compensation:approve','Approve compensation changes'),
  -- Benefits
  ('hr:benefit:create',    'hr:benefit:create',    'Create benefit enrollment'),
  ('hr:benefit:read',      'hr:benefit:read',      'View benefits'),
  ('hr:benefit:update',    'hr:benefit:update',    'Update benefits'),
  -- Shift Scheduling
  ('hr:shift:create',      'hr:shift:create',      'Create shift definitions'),
  ('hr:shift:read',        'hr:shift:read',        'View shifts'),
  ('hr:shift:update',      'hr:shift:update',      'Update shifts'),
  ('hr:shift:assign',      'hr:shift:assign',      'Assign shifts to employees'),
  -- GRC / SoD
  ('grc:sod:create',       'grc:sod:create',       'Create SoD rules'),
  ('grc:sod:read',         'grc:sod:read',         'View SoD rules'),
  ('grc:sod:check',        'grc:sod:check',        'Run SoD checks'),
  -- DMS
  ('dms:document:create',  'dms:document:create',  'Upload documents'),
  ('dms:document:read',    'dms:document:read',    'View documents'),
  ('dms:document:delete',  'dms:document:delete',  'Delete documents'),
  -- EDI
  ('edi:message:create',   'edi:message:create',   'Send EDI messages'),
  ('edi:message:read',     'edi:message:read',     'View EDI messages'),
  -- Archive
  ('sys:archive:manage',   'sys:archive:manage',   'Manage archive policies'),
  ('sys:archive:run',      'sys:archive:run',      'Execute archive runs'),
  -- MDG
  ('mdg:request:create',   'mdg:request:create',   'Submit master data change'),
  ('mdg:request:read',     'mdg:request:read',     'View change requests'),
  ('mdg:request:approve',  'mdg:request:approve',  'Approve master data changes'),
  -- SoD Report
  ('report:sod:read',      'report:sod:read',      'View SoD analysis report')
ON CONFLICT (id) DO NOTHING;
