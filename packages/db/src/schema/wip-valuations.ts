import { pgTable, text, bigint, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const wip_valuations = pgTable('wip_valuations', {
  id: text('id').primaryKey(),
  production_order_id: text('production_order_id').notNull(),
  period: text('period').notNull(),
  material_wip_satang: bigint('material_wip_satang', { mode: 'bigint' }).notNull().default(0n),
  labor_wip_satang: bigint('labor_wip_satang', { mode: 'bigint' }).notNull().default(0n),
  total_wip_satang: bigint('total_wip_satang', { mode: 'bigint' }).notNull().default(0n),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type WipValuation = typeof wip_valuations.$inferSelect;
export type NewWipValuation = typeof wip_valuations.$inferInsert;
