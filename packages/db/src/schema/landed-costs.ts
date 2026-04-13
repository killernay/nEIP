import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { purchase_orders } from './purchase-orders.js';
import { products } from './products.js';

export const landed_costs = pgTable('landed_costs', {
  id: text('id').primaryKey(),
  po_id: text('po_id').notNull().references(() => purchase_orders.id),
  product_id: text('product_id').notNull().references(() => products.id),
  purchase_price_satang: bigint('purchase_price_satang', { mode: 'bigint' }).notNull().default(0n),
  freight_satang: bigint('freight_satang', { mode: 'bigint' }).notNull().default(0n),
  insurance_satang: bigint('insurance_satang', { mode: 'bigint' }).notNull().default(0n),
  customs_duty_satang: bigint('customs_duty_satang', { mode: 'bigint' }).notNull().default(0n),
  excise_satang: bigint('excise_satang', { mode: 'bigint' }).notNull().default(0n),
  handling_satang: bigint('handling_satang', { mode: 'bigint' }).notNull().default(0n),
  other_satang: bigint('other_satang', { mode: 'bigint' }).notNull().default(0n),
  total_landed_satang: bigint('total_landed_satang', { mode: 'bigint' }).notNull().default(0n),
  cost_per_unit_satang: bigint('cost_per_unit_satang', { mode: 'bigint' }).notNull().default(0n),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LandedCost = typeof landed_costs.$inferSelect;
export type NewLandedCost = typeof landed_costs.$inferInsert;
