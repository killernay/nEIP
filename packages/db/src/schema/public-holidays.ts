import { pgTable, text, date, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * public_holidays — Thai public holiday calendar per tenant.
 */
export const public_holidays = pgTable('public_holidays', {
  id: text('id').primaryKey(),
  date: date('date').notNull(),
  name_th: text('name_th').notNull(),
  name_en: text('name_en').notNull(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.tenant_id, t.date),
]);

export type PublicHoliday = typeof public_holidays.$inferSelect;
export type NewPublicHoliday = typeof public_holidays.$inferInsert;
