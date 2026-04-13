import { pgTable, text, integer, bigint, date, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * rebate_agreements — Volume/value rebate agreements with customers.
 *
 * Status: active → settled | inactive
 */
export const rebate_agreements = pgTable('rebate_agreements', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').notNull(),
  product_id: text('product_id'),
  rebate_type: text('rebate_type').notNull().default('volume').$type<'volume' | 'value'>(),
  threshold_quantity: integer('threshold_quantity'),
  threshold_satang: bigint('threshold_satang', { mode: 'bigint' }),
  rebate_percent_bp: integer('rebate_percent_bp').notNull().default(0),
  valid_from: date('valid_from').notNull(),
  valid_to: date('valid_to').notNull(),
  status: text('status').notNull().default('active').$type<'active' | 'inactive' | 'settled'>(),
  accrued_satang: bigint('accrued_satang', { mode: 'bigint' }).notNull().default(0n),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RebateAgreement = typeof rebate_agreements.$inferSelect;
export type NewRebateAgreement = typeof rebate_agreements.$inferInsert;
