import { pgTable, text, bigint, numeric, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { incoterms } from './incoterms.js';

export const trade_declarations = pgTable('trade_declarations', {
  id: text('id').primaryKey(),
  document_number: text('document_number').notNull(),
  type: text('type', { enum: ['import', 'export'] }).notNull(),
  customs_date: text('customs_date').notNull(),
  reference_type: text('reference_type', { enum: ['po', 'so'] }),
  reference_id: text('reference_id'),
  incoterm_code: text('incoterm_code').references(() => incoterms.code),
  country_of_origin: text('country_of_origin'),
  country_of_destination: text('country_of_destination'),
  port_of_loading: text('port_of_loading'),
  port_of_discharge: text('port_of_discharge'),
  vessel_name: text('vessel_name'),
  status: text('status', {
    enum: ['draft', 'submitted', 'inspecting', 'cleared', 'rejected'],
  }).notNull().default('draft'),
  currency_code: text('currency_code').notNull().default('THB'),
  exchange_rate: numeric('exchange_rate', { precision: 18, scale: 6 }).notNull().default('1.0'),
  total_value_satang: bigint('total_value_satang', { mode: 'bigint' }).notNull().default(0n),
  total_duty_satang: bigint('total_duty_satang', { mode: 'bigint' }).notNull().default(0n),
  customs_broker: text('customs_broker'),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TradeDeclaration = typeof trade_declarations.$inferSelect;
export type NewTradeDeclaration = typeof trade_declarations.$inferInsert;
