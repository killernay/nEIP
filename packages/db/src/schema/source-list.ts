import { pgTable, text, date, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';
import { vendors } from './vendors.js';
import { purchasing_contracts } from './purchasing-contracts.js';

export const source_list = pgTable('source_list', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull().references(() => products.id),
  vendor_id: text('vendor_id').notNull().references(() => vendors.id),
  valid_from: date('valid_from').notNull(),
  valid_to: date('valid_to').notNull(),
  is_preferred: boolean('is_preferred').notNull().default(false),
  contract_id: text('contract_id').references(() => purchasing_contracts.id),
  notes: text('notes'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SourceListEntry = typeof source_list.$inferSelect;
export type NewSourceListEntry = typeof source_list.$inferInsert;
