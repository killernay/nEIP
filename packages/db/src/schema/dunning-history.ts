import { pgTable, text, integer, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * dunning_history — Record of dunning actions taken on invoices.
 */
export const dunning_history = pgTable('dunning_history', {
  id: text('id').primaryKey(),
  invoice_id: text('invoice_id').notNull(),
  contact_id: text('contact_id'),
  level: integer('level').notNull(),
  fee_satang: bigint('fee_satang', { mode: 'bigint' }).notNull().default(0n),
  sent_at: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  response: text('response'),
  status: text('status').notNull().default('sent'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DunningHistoryRow = typeof dunning_history.$inferSelect;
export type NewDunningHistoryRow = typeof dunning_history.$inferInsert;
