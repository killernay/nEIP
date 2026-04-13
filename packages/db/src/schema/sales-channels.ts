import { pgTable, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * sales_channels — How the company sells (direct, retail, wholesale, online, etc.)
 */
export const sales_channels = pgTable('sales_channels', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name_th: text('name_th').notNull(),
  name_en: text('name_en'),
  channel_type: text('channel_type').notNull().default('direct'),
  is_active: boolean('is_active').notNull().default(true),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueCode: unique().on(table.code, table.tenant_id),
}));

export type SalesChannel = typeof sales_channels.$inferSelect;
export type NewSalesChannel = typeof sales_channels.$inferInsert;
