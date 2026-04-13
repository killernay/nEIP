import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const material_ledger_entries = pgTable('material_ledger_entries', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull(),
  period: text('period').notNull(),
  actual_cost_satang: bigint('actual_cost_satang', { mode: 'bigint' }).notNull().default(0n),
  standard_cost_satang: bigint('standard_cost_satang', { mode: 'bigint' }).notNull().default(0n),
  variance_satang: bigint('variance_satang', { mode: 'bigint' }).notNull().default(0n),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MaterialLedgerEntry = typeof material_ledger_entries.$inferSelect;
export type NewMaterialLedgerEntry = typeof material_ledger_entries.$inferInsert;
