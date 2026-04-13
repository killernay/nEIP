import { pgTable, text, bigint, integer, numeric } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { trade_declarations } from './trade-declarations.js';
import { products } from './products.js';

export const trade_declaration_lines = pgTable('trade_declaration_lines', {
  id: text('id').primaryKey(),
  declaration_id: text('declaration_id').notNull().references(() => trade_declarations.id, { onDelete: 'cascade' }),
  product_id: text('product_id').references(() => products.id),
  hs_code: text('hs_code'),
  description: text('description'),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  unit: text('unit').notNull().default('PCS'),
  unit_value_satang: bigint('unit_value_satang', { mode: 'bigint' }).notNull().default(0n),
  customs_duty_rate_bp: integer('customs_duty_rate_bp').notNull().default(0),
  customs_duty_satang: bigint('customs_duty_satang', { mode: 'bigint' }).notNull().default(0n),
  excise_rate_bp: integer('excise_rate_bp').notNull().default(0),
  excise_satang: bigint('excise_satang', { mode: 'bigint' }).notNull().default(0n),
  vat_satang: bigint('vat_satang', { mode: 'bigint' }).notNull().default(0n),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
});

export type TradeDeclarationLine = typeof trade_declaration_lines.$inferSelect;
export type NewTradeDeclarationLine = typeof trade_declaration_lines.$inferInsert;
