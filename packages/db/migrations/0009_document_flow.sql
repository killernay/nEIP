-- Migration 0008: Document Flow — QT→SO→DO→INV
--
-- Adds columns to support the full SAP-style document flow:
--   Quotation → Sales Order → Delivery Note → Invoice → Payment
--
-- 1. quotations.converted_sales_order_id — tracks QT→SO conversion
-- 2. invoices.delivery_note_id           — tracks DO→INV conversion
-- 3. invoices.sales_order_id             — tracks SO reference on invoice

-- 1. Add converted_sales_order_id to quotations
ALTER TABLE "quotations"
  ADD COLUMN IF NOT EXISTS "converted_sales_order_id" TEXT;

-- 2. Add delivery_note_id to invoices
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "delivery_note_id" TEXT;

-- 3. Add sales_order_id to invoices
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "sales_order_id" TEXT;

-- Indexes for FK lookups
CREATE INDEX IF NOT EXISTS "idx_quotations_converted_so"
  ON "quotations" ("converted_sales_order_id")
  WHERE "converted_sales_order_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_invoices_delivery_note"
  ON "invoices" ("delivery_note_id")
  WHERE "delivery_note_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_invoices_sales_order"
  ON "invoices" ("sales_order_id")
  WHERE "sales_order_id" IS NOT NULL;
