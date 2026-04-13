import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const accounting_standards = pgTable('accounting_standards', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AccountingStandard = typeof accounting_standards.$inferSelect;
export type NewAccountingStandard = typeof accounting_standards.$inferInsert;
