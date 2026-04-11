-- ============================================================
-- Migration: 0008_ar_payment_journal_entry
-- Description: Add journal_entry_id to ar_payments table so AR
--              payments auto-create journal entries (Dr Cash, Cr AR),
--              matching the AP bill payment pattern.
-- Created: 2026-04-11
-- ============================================================

-- --------------------------------------------------------
-- 1. Add journal_entry_id column to ar_payments
-- --------------------------------------------------------
ALTER TABLE "ar_payments"
  ADD COLUMN IF NOT EXISTS "journal_entry_id" TEXT REFERENCES "journal_entries"("id");

CREATE INDEX IF NOT EXISTS "idx_ar_payments_journal_entry_id"
  ON "ar_payments" ("journal_entry_id")
  WHERE "journal_entry_id" IS NOT NULL;
