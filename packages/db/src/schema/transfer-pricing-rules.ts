import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const transfer_pricing_rules = pgTable('transfer_pricing_rules', {
  id: text('id').primaryKey(),
  from_company_id: text('from_company_id').notNull(),
  to_company_id: text('to_company_id').notNull(),
  product_id: text('product_id'),
  method: text('method', {
    enum: ['cost_plus', 'market', 'negotiated'],
  }).notNull().default('cost_plus'),
  markup_bp: integer('markup_bp').notNull().default(0),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TransferPricingRule = typeof transfer_pricing_rules.$inferSelect;
export type NewTransferPricingRule = typeof transfer_pricing_rules.$inferInsert;
