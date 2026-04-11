import { pgTable, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  name: text('name').notNull(),
  tax_id: text('tax_id'),
  is_branch: boolean('is_branch').notNull().default(false),
  parent_company_id: text('parent_company_id'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueCode: unique().on(table.tenant_id, table.code),
}));

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
