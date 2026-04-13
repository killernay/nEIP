import { pgTable, text, numeric, bigint, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { vendors } from './vendors.js';
import { payment_terms } from './payment-terms.js';

export const purchasing_contracts = pgTable('purchasing_contracts', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  vendor_id: text('vendor_id').notNull().references(() => vendors.id),
  contract_type: text('contract_type').notNull().$type<'quantity' | 'value'>(),
  target_quantity: numeric('target_quantity', { precision: 18, scale: 4 }),
  target_value_satang: bigint('target_value_satang', { mode: 'number' }),
  released_quantity: numeric('released_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  released_value_satang: bigint('released_value_satang', { mode: 'number' }).notNull().default(0),
  valid_from: date('valid_from').notNull(),
  valid_to: date('valid_to').notNull(),
  status: text('status').notNull().default('active').$type<'active' | 'completed' | 'cancelled'>(),
  payment_terms_id: text('payment_terms_id').references(() => payment_terms.id),
  notes: text('notes'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueDocTenant: unique().on(table.document_number, table.tenant_id),
}));

export type PurchasingContract = typeof purchasing_contracts.$inferSelect;
export type NewPurchasingContract = typeof purchasing_contracts.$inferInsert;
