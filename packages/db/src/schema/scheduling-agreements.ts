import { pgTable, text, numeric, date, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { vendors } from './vendors.js';
import { products } from './products.js';

export const scheduling_agreements = pgTable('scheduling_agreements', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  vendor_id: text('vendor_id').notNull().references(() => vendors.id),
  product_id: text('product_id').notNull().references(() => products.id),
  total_quantity: numeric('total_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  delivered_quantity: numeric('delivered_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  schedule: jsonb('schedule').notNull().default([]),
  status: text('status').notNull().default('active').$type<'active' | 'completed' | 'cancelled'>(),
  valid_from: date('valid_from'),
  valid_to: date('valid_to'),
  notes: text('notes'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueDocTenant: unique().on(table.document_number, table.tenant_id),
}));

export type SchedulingAgreement = typeof scheduling_agreements.$inferSelect;
export type NewSchedulingAgreement = typeof scheduling_agreements.$inferInsert;
