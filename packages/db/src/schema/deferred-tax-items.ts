import { pgTable, text, bigint, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const deferred_tax_items = pgTable('deferred_tax_items', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  tax_base_satang: bigint('tax_base_satang', { mode: 'bigint' }).notNull().default(0n),
  accounting_base_satang: bigint('accounting_base_satang', { mode: 'bigint' }).notNull().default(0n),
  temporary_difference_satang: bigint('temporary_difference_satang', { mode: 'bigint' }).notNull().default(0n),
  deferred_tax_asset_satang: bigint('deferred_tax_asset_satang', { mode: 'bigint' }).notNull().default(0n),
  deferred_tax_liability_satang: bigint('deferred_tax_liability_satang', { mode: 'bigint' }).notNull().default(0n),
  tax_rate_bp: integer('tax_rate_bp').notNull().default(2000),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DeferredTaxItem = typeof deferred_tax_items.$inferSelect;
export type NewDeferredTaxItem = typeof deferred_tax_items.$inferInsert;
