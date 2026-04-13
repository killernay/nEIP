-- 0017_bugfixes.sql
-- Fix BUG-4: Add missing product_id and warehouse_id columns to purchase_order_lines

ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES products(id);
ALTER TABLE purchase_order_lines ADD COLUMN IF NOT EXISTS warehouse_id TEXT REFERENCES warehouses(id);

-- BUG-7: Add 'wht' to document_sequences doc_type CHECK constraint
ALTER TABLE document_sequences DROP CONSTRAINT IF EXISTS document_sequences_doc_type_check;
ALTER TABLE document_sequences ADD CONSTRAINT document_sequences_doc_type_check
  CHECK (doc_type IN ('journal_entry','invoice','payment','bill','receipt','quotation','credit_note','delivery_note','sales_order','purchase_order','wht','bill_payment','purchase_requisition','rfq','vendor_return'));

-- BUG-9: Add 'transfer' to stock_movements reference_type CHECK constraint
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reference_type_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_reference_type_check
  CHECK (reference_type IN ('purchase_order','sales_order','delivery_note','manual','transfer'));

-- BUG-10: Add missing product_id and warehouse_id columns to delivery_note_lines
ALTER TABLE delivery_note_lines ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES products(id);
ALTER TABLE delivery_note_lines ADD COLUMN IF NOT EXISTS warehouse_id TEXT REFERENCES warehouses(id);
