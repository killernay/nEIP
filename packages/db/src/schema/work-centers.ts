import { pgTable, text, numeric, bigint, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { departments } from './departments.js';

/**
 * work_centers — Manufacturing work centers / production lines.
 */
export const work_centers = pgTable('work_centers', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name_th: text('name_th').notNull(),
  name_en: text('name_en'),
  capacity_per_hour: numeric('capacity_per_hour', { precision: 10, scale: 2 }).default('1'),
  cost_rate_satang: bigint('cost_rate_satang', { mode: 'number' }).default(0),
  department_id: text('department_id')
    .references(() => departments.id),
  is_active: boolean('is_active').default(true),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueCodeTenant: unique().on(table.code, table.tenant_id),
}));

export type WorkCenter = typeof work_centers.$inferSelect;
export type NewWorkCenter = typeof work_centers.$inferInsert;
