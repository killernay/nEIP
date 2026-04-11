import { pgTable, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * recurring_je_templates — Templates for recurring journal entries.
 *
 * frequency: 'monthly' | 'quarterly' | 'annually'
 * lines: JSON array of { accountId, description, debitSatang, creditSatang }
 */
export const recurring_je_templates = pgTable('recurring_je_templates', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  lines: jsonb('lines').notNull().default('[]'),
  frequency: text('frequency').notNull().default('monthly'),
  next_run_date: text('next_run_date').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  last_run_at: timestamp('last_run_at', { withTimezone: true }),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RecurringJeTemplate = typeof recurring_je_templates.$inferSelect;
export type NewRecurringJeTemplate = typeof recurring_je_templates.$inferInsert;
