import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const closing_tasks = pgTable('closing_tasks', {
  id: text('id').primaryKey(),
  period: text('period').notNull(),
  task_name: text('task_name').notNull(),
  task_type: text('task_type').notNull(),
  sequence: integer('sequence').notNull().default(0),
  status: text('status', {
    enum: ['pending', 'in_progress', 'completed', 'skipped'],
  }).notNull().default('pending'),
  completed_by: text('completed_by'),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ClosingTask = typeof closing_tasks.$inferSelect;
export type NewClosingTask = typeof closing_tasks.$inferInsert;
