import { pgTable, text, bigint, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const lease_contracts = pgTable('lease_contracts', {
  id: text('id').primaryKey(),
  contract_number: text('contract_number').notNull(),
  lessor: text('lessor').notNull(),
  lessee_company_id: text('lessee_company_id').notNull(),
  asset_description: text('asset_description').notNull(),
  lease_type: text('lease_type', { enum: ['operating', 'finance'] }).notNull().default('operating'),
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  monthly_payment_satang: bigint('monthly_payment_satang', { mode: 'bigint' }).notNull().default(0n),
  total_payments: integer('total_payments').notNull().default(0),
  discount_rate_bp: integer('discount_rate_bp').notNull().default(0),
  right_of_use_asset_satang: bigint('right_of_use_asset_satang', { mode: 'bigint' }).notNull().default(0n),
  lease_liability_satang: bigint('lease_liability_satang', { mode: 'bigint' }).notNull().default(0n),
  status: text('status', { enum: ['draft', 'active', 'terminated', 'expired'] }).notNull().default('draft'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LeaseContract = typeof lease_contracts.$inferSelect;
export type NewLeaseContract = typeof lease_contracts.$inferInsert;
