import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { approval_requests } from './approval-requests.js';

export const approval_actions = pgTable('approval_actions', {
  id: text('id').primaryKey(),
  request_id: text('request_id')
    .notNull()
    .references(() => approval_requests.id, { onDelete: 'cascade' }),
  step: integer('step').notNull(),
  action: text('action').notNull().$type<'approve' | 'reject' | 'delegate'>(),
  actor_id: text('actor_id').notNull(),
  delegate_to: text('delegate_to'),
  comment: text('comment'),
  acted_at: timestamp('acted_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ApprovalAction = typeof approval_actions.$inferSelect;
export type NewApprovalAction = typeof approval_actions.$inferInsert;
