-- Migration: 0021_onboarding
-- Story:     Onboarding Wizard + Industry Templates
-- Created:   2026-04-13

-- ---------------------------------------------------------------------------
-- 1. Tenant onboarding state tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenant_onboarding (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  current_step INTEGER NOT NULL DEFAULT 1,
  industry_template TEXT,
  company_name TEXT,
  company_tax_id TEXT,
  company_type TEXT CHECK (company_type IN (
    'limited','partnership','sole_proprietorship',
    'public_limited','cooperative','holding'
  )),
  fiscal_year_start INTEGER DEFAULT 1,
  base_currency TEXT DEFAULT 'THB',
  selected_modules TEXT[] DEFAULT '{}',
  enterprise_structure JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. Industry templates (seed / reference data)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS industry_templates (
  code TEXT PRIMARY KEY,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  icon TEXT,
  default_modules TEXT[] NOT NULL,
  default_coa_preset TEXT NOT NULL DEFAULT 'tfac_standard',
  default_tax_config JSONB DEFAULT '{}',
  default_roles TEXT[] DEFAULT '{}'
);

-- ---------------------------------------------------------------------------
-- 3. Seed 7 industry templates
-- ---------------------------------------------------------------------------

INSERT INTO industry_templates (code, name_th, name_en, description_th, description_en, icon, default_modules, default_coa_preset, default_tax_config, default_roles)
VALUES
  ('retail', 'ค้าปลีก', 'Retail & POS',
   'ร้านค้า ห้างสรรพสินค้า ร้านสะดวกซื้อ', 'Shops, department stores, convenience stores',
   'ShoppingBag',
   '{finance,ar,ap,bank,tax,inventory,sales,purchasing,crm}',
   'tfac_retail',
   '{"vat_rate": 700, "wht_services": 300}',
   '{accountant,sales_rep,warehouse}'),

  ('manufacturing', 'โรงงาน', 'Manufacturing',
   'โรงงานผลิตสินค้า ประกอบชิ้นส่วน', 'Factory, assembly, production',
   'Factory',
   '{finance,ar,ap,bank,tax,inventory,sales,purchasing,manufacturing,quality,controlling}',
   'tfac_manufacturing',
   '{"vat_rate": 700}',
   '{accountant,factory_manager,purchasing,warehouse}'),

  ('food_beverage', 'อาหารและเครื่องดื่ม', 'Food & Beverage',
   'โรงงานอาหาร ร้านอาหาร เครื่องดื่ม', 'Food processing, restaurants, beverages',
   'UtensilsCrossed',
   '{finance,ar,ap,bank,tax,inventory,sales,purchasing,manufacturing,quality,hr,payroll}',
   'tfac_food',
   '{"vat_rate": 700, "vat_exempt_products": true}',
   '{accountant,factory_manager,hr_manager}'),

  ('services', 'บริการ/ที่ปรึกษา', 'Professional Services',
   'ที่ปรึกษา กฎหมาย บัญชี IT', 'Consulting, legal, accounting, IT services',
   'Briefcase',
   '{finance,ar,ap,bank,tax,projects,hr,payroll,crm}',
   'tfac_services',
   '{"vat_rate": 700, "wht_services": 300}',
   '{accountant,sales_rep,hr_manager}'),

  ('construction', 'ก่อสร้าง/อสังหา', 'Construction & Real Estate',
   'รับเหมาก่อสร้าง พัฒนาอสังหาริมทรัพย์', 'Construction, real estate development',
   'Building2',
   '{finance,ar,ap,bank,tax,assets,inventory,purchasing,projects,controlling}',
   'tfac_construction',
   '{"vat_rate": 700, "wht_services": 300, "retention_billing": true}',
   '{accountant,purchasing}'),

  ('trading', 'นำเข้า-ส่งออก', 'Import-Export Trading',
   'ค้าขายระหว่างประเทศ นำเข้า ส่งออก', 'International trade, import, export',
   'Globe',
   '{finance,ar,ap,bank,tax,inventory,sales,purchasing,trade,multicurrency}',
   'tfac_trading',
   '{"vat_rate": 700, "zero_rated_exports": true}',
   '{accountant,sales_rep,purchasing}'),

  ('distribution', 'จัดจำหน่าย', 'Wholesale Distribution',
   'ตัวแทนจำหน่าย ค้าส่ง กระจายสินค้า', 'Distributors, wholesalers',
   'Truck',
   '{finance,ar,ap,bank,tax,inventory,sales,purchasing,crm}',
   'tfac_distribution',
   '{"vat_rate": 700, "rebate_management": true}',
   '{accountant,sales_rep,warehouse}')
ON CONFLICT (code) DO NOTHING;
