import { pgTable, text, integer, timestamp, date } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { products } from './products.js';

/**
 * bom_headers — Bill of Materials header. Each BOM belongs to a product
 * and can have multiple versions.
 */
export const bom_headers = pgTable('bom_headers', {
  id: text('id').primaryKey(),
  product_id: text('product_id')
    .notNull()
    .references(() => products.id),
  version: integer('version').notNull().default(1),
  name_th: text('name_th'),
  name_en: text('name_en'),
  status: text('status')
    .notNull()
    .default('active')
    .$type<'draft' | 'active' | 'obsolete'>(),
  valid_from: date('valid_from'),
  valid_to: date('valid_to'),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type BomHeader = typeof bom_headers.$inferSelect;
export type NewBomHeader = typeof bom_headers.$inferInsert;
