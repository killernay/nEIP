import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { users } from './users.js';

/**
 * saved_reports — User-defined custom report configurations.
 */
export const saved_reports = pgTable('saved_reports', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  name: text('name').notNull(),
  data_source: text('data_source').notNull(),
  dimensions: jsonb('dimensions').notNull().default([]),
  measures: jsonb('measures').notNull().default([]),
  filters: jsonb('filters').notNull().default([]),
  created_by: text('created_by')
    .notNull()
    .references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SavedReport = typeof saved_reports.$inferSelect;
export type NewSavedReport = typeof saved_reports.$inferInsert;
