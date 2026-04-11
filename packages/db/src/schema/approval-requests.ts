import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { approval_workflows } from './approval-workflows.js';

export const approval_requests = pgTable('approval_requests', {
  id: text('id').primaryKey(),
  document_id: text('document_id').notNull(),
  document_type: text('document_type').notNull(),
  workflow_id: text('workflow_id')
    .notNull()
    .references(() => approval_workflows.id),
  current_step: integer('current_step').notNull().default(1),
  status: text('status').notNull().default('pending').$type<'pending' | 'approved' | 'rejected' | 'delegated'>(),
  submitted_by: text('submitted_by').notNull(),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ApprovalRequest = typeof approval_requests.$inferSelect;
export type NewApprovalRequest = typeof approval_requests.$inferInsert;
