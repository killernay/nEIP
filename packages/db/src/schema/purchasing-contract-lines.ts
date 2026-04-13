import { pgTable, text, numeric, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';
import { purchasing_contracts } from './purchasing-contracts.js';

export const purchasing_contract_lines = pgTable('purchasing_contract_lines', {
  id: text('id').primaryKey(),
  contract_id: text('contract_id').notNull().references(() => purchasing_contracts.id, { onDelete: 'cascade' }),
  product_id: text('product_id').notNull().references(() => products.id),
  unit_price_satang: bigint('unit_price_satang', { mode: 'number' }).notNull().default(0),
  target_quantity: numeric('target_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  released_quantity: numeric('released_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PurchasingContractLine = typeof purchasing_contract_lines.$inferSelect;
export type NewPurchasingContractLine = typeof purchasing_contract_lines.$inferInsert;
