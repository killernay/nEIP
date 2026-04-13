import { pgTable, text, date, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { bom_headers } from './bom-headers.js';

export const engineering_changes = pgTable('engineering_changes', {
  id: text('id').primaryKey(),
  change_number: text('change_number').notNull(),
  bom_id: text('bom_id').notNull().references(() => bom_headers.id),
  change_type: text('change_type').notNull().$type<'add' | 'remove' | 'modify'>(),
  description: text('description').notNull(),
  reason: text('reason'),
  effective_date: date('effective_date').notNull(),
  status: text('status').notNull().default('proposed').$type<'proposed' | 'approved' | 'rejected' | 'implemented'>(),
  approved_by: text('approved_by'),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  implemented_at: timestamp('implemented_at', { withTimezone: true }),
  change_details: jsonb('change_details'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueChangeTenant: unique().on(table.change_number, table.tenant_id),
}));

export type EngineeringChange = typeof engineering_changes.$inferSelect;
export type NewEngineeringChange = typeof engineering_changes.$inferInsert;
