import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * contact_partners — Partner determination for contacts
 * (sold-to, ship-to, bill-to, payer roles).
 */
export const contact_partners = pgTable('contact_partners', {
  id: text('id').primaryKey(),
  contact_id: text('contact_id').notNull(),
  partner_function: text('partner_function')
    .notNull()
    .$type<'sold_to' | 'ship_to' | 'bill_to' | 'payer'>(),
  partner_contact_id: text('partner_contact_id').notNull(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ContactPartner = typeof contact_partners.$inferSelect;
export type NewContactPartner = typeof contact_partners.$inferInsert;
