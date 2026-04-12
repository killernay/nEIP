import { pgTable, text, integer, bigint, timestamp, unique } from 'drizzle-orm/pg-core';
import { approval_workflows } from './approval-workflows.js';

/**
 * approval_steps — Steps within an approval workflow.
 *
 * Tenant isolation: inherited via workflow_id FK → approval_workflows.tenant_id.
 * A direct tenant_id column is intentionally omitted to avoid denormalization;
 * all queries join through the parent workflow which enforces tenant scoping.
 */
export const approval_steps = pgTable('approval_steps', {
  id: text('id').primaryKey(),
  workflow_id: text('workflow_id')
    .notNull()
    .references(() => approval_workflows.id, { onDelete: 'cascade' }),
  step_order: integer('step_order').notNull(),
  approver_role: text('approver_role').notNull(),
  amount_threshold_satang: bigint('amount_threshold_satang', { mode: 'bigint' }).notNull().default(0n),
  auto_escalate_hours: integer('auto_escalate_hours'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueStep: unique().on(table.workflow_id, table.step_order),
}));

export type ApprovalStep = typeof approval_steps.$inferSelect;
export type NewApprovalStep = typeof approval_steps.$inferInsert;
