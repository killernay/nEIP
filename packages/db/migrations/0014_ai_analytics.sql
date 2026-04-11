-- Migration 0009: AI & Analytics tables
-- Stories 6.3, 6.6, 6.7

-- 6.3: Categorization rules (learning from corrections)
CREATE TABLE IF NOT EXISTS categorization_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  keyword_pattern TEXT NOT NULL,
  account_id    UUID NOT NULL REFERENCES chart_of_accounts(id),
  hit_count     INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categorization_rules_tenant ON categorization_rules(tenant_id);
CREATE INDEX idx_categorization_rules_keyword ON categorization_rules(tenant_id, keyword_pattern);

-- 6.6: Saved custom reports
CREATE TABLE IF NOT EXISTS saved_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  name          TEXT NOT NULL,
  data_source   TEXT NOT NULL CHECK (data_source IN ('gl', 'ar', 'ap', 'hr', 'inventory')),
  dimensions    JSONB NOT NULL DEFAULT '[]',
  measures      JSONB NOT NULL DEFAULT '[]',
  filters       JSONB NOT NULL DEFAULT '[]',
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_reports_tenant ON saved_reports(tenant_id);
CREATE INDEX idx_saved_reports_created_by ON saved_reports(tenant_id, created_by);

-- 6.7: Dashboard role-based configurations
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  role          TEXT NOT NULL,
  widgets       JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, role)
);

CREATE INDEX idx_dashboard_configs_tenant_role ON dashboard_configs(tenant_id, role);

-- Seed default dashboard configs
INSERT INTO dashboard_configs (tenant_id, role, widgets)
SELECT t.id, role.name, role.widgets
FROM tenants t
CROSS JOIN (VALUES
  ('cfo', '["revenue_trend","expense_breakdown","cash_flow","ar_aging","budget_utilization","predictive_revenue"]'::jsonb),
  ('accountant', '["trial_balance","journal_entries","ar_aging","ap_aging","bank_reconciliation"]'::jsonb),
  ('sales', '["revenue_trend","ar_aging","top_customers","quotation_pipeline"]'::jsonb),
  ('hr', '["headcount","payroll_summary","leave_balance","department_costs"]'::jsonb)
) AS role(name, widgets)
ON CONFLICT (tenant_id, role) DO NOTHING;
