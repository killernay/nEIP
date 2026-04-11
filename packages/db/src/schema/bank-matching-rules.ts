import { pgTable, text, integer, bigint, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const bank_matching_rules = pgTable('bank_matching_rules', {
  id: text('id').primaryKey(),
  priority: integer('priority').notNull().default(0),
  match_type: text('match_type').notNull().$type<'exact_amount' | 'reference' | 'amount_range'>(),
  field: text('field').notNull().default('description'),
  pattern: text('pattern').notNull(),
  min_amount_satang: bigint('min_amount_satang', { mode: 'bigint' }),
  max_amount_satang: bigint('max_amount_satang', { mode: 'bigint' }),
  target_account_id: text('target_account_id').notNull(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BankMatchingRule = typeof bank_matching_rules.$inferSelect;
export type NewBankMatchingRule = typeof bank_matching_rules.$inferInsert;
