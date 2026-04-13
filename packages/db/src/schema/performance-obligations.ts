import { pgTable, text, bigint, integer, timestamp } from 'drizzle-orm/pg-core';
import { revenue_contracts } from './revenue-contracts.js';

export const performance_obligations = pgTable('performance_obligations', {
  id: text('id').primaryKey(),
  contract_id: text('contract_id').notNull().references(() => revenue_contracts.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  standalone_price_satang: bigint('standalone_price_satang', { mode: 'bigint' }).notNull().default(0n),
  allocation_satang: bigint('allocation_satang', { mode: 'bigint' }).notNull().default(0n),
  satisfaction_method: text('satisfaction_method', { enum: ['point_in_time', 'over_time'] }).notNull().default('point_in_time'),
  progress_percent: integer('progress_percent').notNull().default(0),
  recognized_satang: bigint('recognized_satang', { mode: 'bigint' }).notNull().default(0n),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PerformanceObligation = typeof performance_obligations.$inferSelect;
export type NewPerformanceObligation = typeof performance_obligations.$inferInsert;
