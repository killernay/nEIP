-- Year-End Closing: add status and closing_je_id to fiscal_years
-- Also expand document_sequences doc_type enum for new document types

-- Add status column (default 'open' for existing rows)
ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

-- Add closing_je_id to track the closing journal entry for reversal on reopen
ALTER TABLE fiscal_years ADD COLUMN IF NOT EXISTS closing_je_id TEXT;

-- Note: document_sequences.doc_type is a TEXT column with app-level validation,
-- so no ALTER needed for the new doc types (quotation, credit_note, etc.).
