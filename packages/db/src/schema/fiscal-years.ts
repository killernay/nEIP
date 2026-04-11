import { pgTable, text, integer, date, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * fiscal_years — Fiscal year definitions per tenant.
 *
 * Architecture reference: Story 2.7.
 *
 * Each fiscal year automatically generates 12 monthly periods upon creation.
 * status: 'open' | 'closed' — managed by year-end closing.
 * closing_je_id: references the closing journal entry created during year-end close.
 */
export const fiscal_years = pgTable(
  'fiscal_years',
  {
    id: text('id').primaryKey(),
    year: integer('year').notNull(),
    start_date: date('start_date').notNull(),
    end_date: date('end_date').notNull(),
    status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
    closing_je_id: text('closing_je_id'),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_fiscal_years_tenant_year').on(table.tenant_id, table.year),
  ],
);

export type FiscalYear = typeof fiscal_years.$inferSelect;
export type NewFiscalYear = typeof fiscal_years.$inferInsert;
