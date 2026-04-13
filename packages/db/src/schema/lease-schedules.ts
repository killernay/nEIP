import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { lease_contracts } from './lease-contracts.js';

export const lease_schedules = pgTable('lease_schedules', {
  id: text('id').primaryKey(),
  lease_id: text('lease_id').notNull().references(() => lease_contracts.id, { onDelete: 'cascade' }),
  period_date: text('period_date').notNull(),
  payment_satang: bigint('payment_satang', { mode: 'bigint' }).notNull().default(0n),
  interest_satang: bigint('interest_satang', { mode: 'bigint' }).notNull().default(0n),
  principal_satang: bigint('principal_satang', { mode: 'bigint' }).notNull().default(0n),
  remaining_liability_satang: bigint('remaining_liability_satang', { mode: 'bigint' }).notNull().default(0n),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LeaseSchedule = typeof lease_schedules.$inferSelect;
export type NewLeaseSchedule = typeof lease_schedules.$inferInsert;
