import { pgTable, text, integer, unique } from 'drizzle-orm/pg-core';
import { contacts } from './contacts.js';
import { price_lists } from './price-lists.js';
import { tenants } from './tenants.js';

/**
 * customer_price_lists — Customer-specific price list assignments.
 */
export const customer_price_lists = pgTable('customer_price_lists', {
  id: text('id').primaryKey(),
  contact_id: text('contact_id')
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  price_list_id: text('price_list_id')
    .notNull()
    .references(() => price_lists.id, { onDelete: 'cascade' }),
  priority: integer('priority').notNull().default(0),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
}, (t) => [
  unique().on(t.contact_id, t.price_list_id),
]);

export type CustomerPriceList = typeof customer_price_lists.$inferSelect;
export type NewCustomerPriceList = typeof customer_price_lists.$inferInsert;
