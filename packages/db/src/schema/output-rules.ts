import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * output_rules — Auto output determination rules (email, print, webhook)
 * triggered on document lifecycle events.
 */
export const output_rules = pgTable('output_rules', {
  id: text('id').primaryKey(),
  document_type: text('document_type').notNull(),
  condition: text('condition').notNull().default('on_post').$type<'on_post' | 'on_send' | 'on_approve'>(),
  output_type: text('output_type').notNull().default('email').$type<'email' | 'print' | 'webhook'>(),
  template_name: text('template_name').notNull(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OutputRule = typeof output_rules.$inferSelect;
export type NewOutputRule = typeof output_rules.$inferInsert;
