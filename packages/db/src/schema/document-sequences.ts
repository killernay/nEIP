import { pgTable, text, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * document_sequences — Sequential, gap-free document numbering.
 *
 * Architecture reference: Story 2.6.
 *
 * One row per (tenant_id, doc_type, fiscal_year) combination.
 * `last_number` tracks the last assigned number — the next document gets last_number + 1.
 * Concurrency safety is ensured via PostgreSQL advisory locks in the domain layer.
 */
export const document_sequences = pgTable(
  'document_sequences',
  {
    id: text('id').primaryKey(),
    doc_type: text('doc_type', {
      enum: [
        'journal_entry', 'invoice', 'payment', 'bill', 'receipt',
        'quotation', 'credit_note', 'delivery_note', 'sales_order',
        'purchase_order', 'wht', 'bill_payment',
      ],
    }).notNull(),
    fiscal_year: integer('fiscal_year').notNull(),
    prefix: text('prefix').notNull(),
    last_number: integer('last_number').notNull().default(0),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_doc_seq_tenant_type_year').on(
      table.tenant_id,
      table.doc_type,
      table.fiscal_year,
    ),
  ],
);

export type DocumentSequence = typeof document_sequences.$inferSelect;
export type NewDocumentSequence = typeof document_sequences.$inferInsert;
