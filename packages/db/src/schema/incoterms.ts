import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const incoterms = pgTable('incoterms', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  risk_transfer_point: text('risk_transfer_point'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Incoterm = typeof incoterms.$inferSelect;
export type NewIncoterm = typeof incoterms.$inferInsert;
