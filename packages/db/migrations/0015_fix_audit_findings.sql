-- Migration 0015: Audit finding fixes
-- C-3: Add tenant_id to price_list_items
-- H-2: Add FK constraint on dunning_history.invoice_id
-- H-5: Add missing indexes for price_list_items, dunning_history, recurring_je_templates

-- C-3: price_list_items.tenant_id
ALTER TABLE price_list_items ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants(id);

-- H-2: dunning_history FK to invoices
ALTER TABLE dunning_history ADD CONSTRAINT fk_dunning_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- H-5: Missing indexes
CREATE INDEX IF NOT EXISTS idx_price_list_items_price_list ON price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_price_list_items_product ON price_list_items(product_id);
CREATE INDEX IF NOT EXISTS idx_dunning_history_invoice ON dunning_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dunning_history_tenant ON dunning_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_je_templates_tenant ON recurring_je_templates(tenant_id);
