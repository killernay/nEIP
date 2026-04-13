-- 0022_role_templates.sql — Role templates with module-page mappings for UI visibility
-- Each role template defines which modules and pages a user with that role can see.

CREATE TABLE IF NOT EXISTS role_templates (
  code TEXT PRIMARY KEY,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  allowed_modules TEXT[] NOT NULL DEFAULT '{}',
  allowed_pages TEXT[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default role templates
INSERT INTO role_templates (code, name_th, name_en, allowed_modules, allowed_pages, is_system) VALUES
('system_admin', 'ผู้ดูแลระบบ', 'System Administrator', '{finance,ar,ap,assets,bank,tax,controlling,inventory,sales,purchasing,manufacturing,hr,payroll,leave,projects,quality,trade,crm,multicurrency,multicompany,approvals,ai,documents}', '{*}', true),

('accountant', 'นักบัญชี', 'Accountant', '{finance,ar,ap,assets,bank,tax,controlling}', '{/accounts,/journal-entries,/invoices,/bills,/payments,/receipts,/credit-notes,/fixed-assets,/bank,/wht,/reports,/reports/*,/settings/fiscal,/settings/tax,/month-end,/budgets,/cost-centers,/profit-centers,/recurring-je,/dunning}', false),

('sales_rep', 'พนักงานขาย', 'Sales Representative', '{sales,crm,ar}', '{/quotations,/sales-orders,/delivery-notes,/invoices,/receipts,/contacts,/pricing,/dashboard}', false),

('purchasing', 'จัดซื้อ', 'Purchasing Officer', '{purchasing,inventory,ap}', '{/purchase-requisitions,/rfqs,/purchase-orders,/vendors,/bills,/inventory,/products,/stock-counts}', false),

('hr_manager', 'ผู้จัดการฝ่ายบุคคล', 'HR Manager', '{hr,payroll,leave}', '{/employees,/departments,/positions,/payroll,/leave,/attendance,/settings/leave-calendar}', false),

('factory_manager', 'ผู้จัดการโรงงาน', 'Factory Manager', '{manufacturing,inventory,quality}', '{/manufacturing,/products,/inventory,/stock-counts,/quality,/warehouse}', false),

('warehouse', 'คลังสินค้า', 'Warehouse Staff', '{inventory}', '{/products,/inventory,/stock-counts,/warehouse}', false),

('executive', 'ผู้บริหาร', 'Executive / CEO', '{finance,ar,ap,controlling,sales,ai}', '{/dashboard,/reports,/reports/*,/ai,/ai/*,/cost-centers,/profit-centers}', false)
ON CONFLICT (code) DO NOTHING;
