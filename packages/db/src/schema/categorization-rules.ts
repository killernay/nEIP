import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { chart_of_accounts } from './chart-of-accounts.js';

/**
 * categorization_rules — AI-learned rules for automatic transaction categorization.
 */
export const categorization_rules = pgTable('categorization_rules', {
  id: text('id').primaryKey(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  keyword_pattern: text('keyword_pattern').notNull(),
  account_id: text('account_id')
    .notNull()
    .references(() => chart_of_accounts.id),
  hit_count: integer('hit_count').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CategorizationRule = typeof categorization_rules.$inferSelect;
export type NewCategorizationRule = typeof categorization_rules.$inferInsert;
