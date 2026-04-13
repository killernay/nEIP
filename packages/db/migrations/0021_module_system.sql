-- 0021_module_system.sql — Module Toggle System
-- Module registry (system-wide, not per-tenant)
CREATE TABLE IF NOT EXISTS module_registry (
  code TEXT PRIMARY KEY,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('core','finance','operations','vertical','advanced')),
  dependencies TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0
);

-- Per-tenant module activation
CREATE TABLE IF NOT EXISTS tenant_modules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  module_code TEXT NOT NULL REFERENCES module_registry(code),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  UNIQUE(tenant_id, module_code)
);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant ON tenant_modules(tenant_id);

-- Seed module registry
INSERT INTO module_registry (code, name_th, name_en, tier, dependencies, is_default, sort_order) VALUES
('finance', 'บัญชีการเงิน', 'Financial Accounting', 'core', '{}', true, 1),
('ar', 'ลูกหนี้', 'Accounts Receivable', 'finance', '{finance}', true, 2),
('ap', 'เจ้าหนี้', 'Accounts Payable', 'finance', '{finance}', true, 3),
('assets', 'สินทรัพย์ถาวร', 'Fixed Assets', 'finance', '{finance}', false, 4),
('bank', 'ธนาคาร', 'Bank & Reconciliation', 'finance', '{finance}', true, 5),
('tax', 'ภาษี', 'Tax & WHT', 'finance', '{finance}', true, 6),
('controlling', 'บัญชีบริหาร', 'Controlling (CO)', 'finance', '{finance}', false, 7),
('inventory', 'คลังสินค้า', 'Inventory Management', 'operations', '{finance}', false, 10),
('sales', 'ขาย', 'Sales & Distribution', 'operations', '{ar,inventory}', false, 11),
('purchasing', 'จัดซื้อ', 'Procurement', 'operations', '{ap,inventory}', false, 12),
('manufacturing', 'ผลิต', 'Manufacturing (PP)', 'vertical', '{inventory,purchasing}', false, 20),
('hr', 'บุคคล', 'Human Resources', 'operations', '{}', false, 13),
('payroll', 'เงินเดือน', 'Payroll', 'operations', '{hr,finance}', false, 14),
('leave', 'ลา', 'Leave Management', 'operations', '{hr}', false, 15),
('projects', 'โครงการ', 'Project System', 'vertical', '{finance}', false, 21),
('quality', 'คุณภาพ', 'Quality Management', 'vertical', '{inventory}', false, 22),
('trade', 'นำเข้าส่งออก', 'Import/Export Trade', 'vertical', '{finance,inventory}', false, 23),
('crm', 'ลูกค้าสัมพันธ์', 'CRM', 'operations', '{}', false, 16),
('multicurrency', 'หลายสกุลเงิน', 'Multi-Currency', 'advanced', '{finance}', false, 30),
('multicompany', 'หลายบริษัท', 'Multi-Company', 'advanced', '{finance}', false, 31),
('approvals', 'อนุมัติ', 'Approval Workflows', 'advanced', '{}', false, 32),
('ai', 'AI', 'AI & Analytics', 'advanced', '{}', false, 33),
('documents', 'เอกสาร', 'Document Management', 'advanced', '{}', false, 34)
ON CONFLICT (code) DO NOTHING;
