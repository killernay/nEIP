import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { rebate_agreements } from './rebate-agreements.js';

/**
 * rebate_settlements — Period settlement records for rebate agreements.
 */
export const rebate_settlements = pgTable('rebate_settlements', {
  id: text('id').primaryKey(),
  agreement_id: text('agreement_id')
    .notNull()
    .references(() => rebate_agreements.id),
  period: text('period').notNull(),
  settled_amount_satang: bigint('settled_amount_satang', { mode: 'bigint' }).notNull().default(0n),
  credit_note_id: text('credit_note_id'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RebateSettlement = typeof rebate_settlements.$inferSelect;
export type NewRebateSettlement = typeof rebate_settlements.$inferInsert;
