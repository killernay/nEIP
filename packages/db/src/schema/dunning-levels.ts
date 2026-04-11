import { pgTable, text, integer, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * dunning_levels — Dunning escalation configuration per tenant.
 */
export const dunning_levels = pgTable('dunning_levels', {
  id: text('id').primaryKey(),
  level: integer('level').notNull(),
  days_overdue: integer('days_overdue').notNull(),
  template: text('template').notNull().default(''),
  fee_satang: bigint('fee_satang', { mode: 'bigint' }).notNull().default(0n),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DunningLevel = typeof dunning_levels.$inferSelect;
export type NewDunningLevel = typeof dunning_levels.$inferInsert;
