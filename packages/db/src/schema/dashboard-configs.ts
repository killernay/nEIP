import { pgTable, text, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * dashboard_configs — Role-based dashboard widget configurations.
 */
export const dashboard_configs = pgTable('dashboard_configs', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  role: text('role').notNull(),
  widgets: jsonb('widgets').notNull().default([]),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.tenant_id, t.role),
]);

export type DashboardConfig = typeof dashboard_configs.$inferSelect;
export type NewDashboardConfig = typeof dashboard_configs.$inferInsert;
