-- 0030_fix_check_constraints.sql
-- Fix CHECK constraints that block new document types and plan types

-- BUG 1 & 2: Add 'lease', 'revenue_contract', 'maintenance_order', 'service_entry_sheet'
-- to document_sequences doc_type CHECK constraint
ALTER TABLE document_sequences DROP CONSTRAINT IF EXISTS document_sequences_doc_type_check;
ALTER TABLE document_sequences ADD CONSTRAINT document_sequences_doc_type_check
  CHECK (doc_type IN (
    'journal_entry','invoice','payment','bill','receipt','quotation',
    'credit_note','delivery_note','sales_order','purchase_order','wht',
    'bill_payment','purchase_requisition','rfq','vendor_return',
    'service_entry_sheet','lease','revenue_contract','maintenance_order'
  ));

-- BUG 3: Add 'preventive' and 'corrective' to maintenance_plans plan_type CHECK constraint
ALTER TABLE maintenance_plans DROP CONSTRAINT IF EXISTS maintenance_plans_plan_type_check;
ALTER TABLE maintenance_plans ADD CONSTRAINT maintenance_plans_plan_type_check
  CHECK (plan_type IN ('preventive_time','preventive_counter','condition_based','preventive','corrective'));
