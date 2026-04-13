import { pgTable, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { companies } from './companies.js';
import { employees } from './employees.js';

/**
 * branches — Physical locations (offices, factories, warehouses, retail stores)
 * belonging to a company entity.
 */
export const branches = pgTable('branches', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name_th: text('name_th').notNull(),
  name_en: text('name_en'),
  company_id: text('company_id').references(() => companies.id),
  branch_type: text('branch_type').notNull().default('office'),
  address_th: text('address_th'),
  address_en: text('address_en'),
  phone: text('phone'),
  manager_id: text('manager_id').references(() => employees.id),
  is_active: boolean('is_active').notNull().default(true),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueCode: unique().on(table.code, table.tenant_id),
}));

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
