import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const approval_workflows = pgTable('approval_workflows', {
  id: text('id').primaryKey(),
  document_type: text('document_type').notNull(),
  name: text('name').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ApprovalWorkflow = typeof approval_workflows.$inferSelect;
export type NewApprovalWorkflow = typeof approval_workflows.$inferInsert;
