import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { departments } from './departments.js';

/**
 * positions — HR position management.
 */
export const positions = pgTable('positions', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  title: text('title').notNull(),
  department_id: text('department_id').references(() => departments.id),
  reports_to_position_id: text('reports_to_position_id'),
  headcount: integer('headcount').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
