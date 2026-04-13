import { pgTable, text, numeric, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';
import { work_centers } from './work-centers.js';
import { warehouses } from './warehouses.js';

export const kanban_cards = pgTable('kanban_cards', {
  id: text('id').primaryKey(),
  card_number: text('card_number').notNull(),
  product_id: text('product_id').notNull().references(() => products.id),
  source_supply: text('source_supply').notNull().$type<'production' | 'purchasing' | 'transfer'>(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  work_center_id: text('work_center_id').references(() => work_centers.id),
  warehouse_id: text('warehouse_id').references(() => warehouses.id),
  status: text('status').notNull().default('empty').$type<'empty' | 'in_process' | 'full'>(),
  last_triggered_at: timestamp('last_triggered_at', { withTimezone: true }),
  notes: text('notes'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueCardTenant: unique().on(table.card_number, table.tenant_id),
}));

export type KanbanCard = typeof kanban_cards.$inferSelect;
export type NewKanbanCard = typeof kanban_cards.$inferInsert;
