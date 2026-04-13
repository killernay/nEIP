import { pgTable, text, bigint, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const letters_of_credit = pgTable('letters_of_credit', {
  id: text('id').primaryKey(),
  lc_number: text('lc_number').notNull(),
  type: text('type', { enum: ['import', 'export'] }).notNull(),
  issuing_bank: text('issuing_bank').notNull(),
  advising_bank: text('advising_bank'),
  beneficiary: text('beneficiary').notNull(),
  applicant: text('applicant').notNull(),
  amount_satang: bigint('amount_satang', { mode: 'bigint' }).notNull().default(0n),
  currency_code: text('currency_code').notNull().default('THB'),
  issue_date: text('issue_date').notNull(),
  expiry_date: text('expiry_date').notNull(),
  shipment_deadline: text('shipment_deadline'),
  reference_type: text('reference_type', { enum: ['po', 'so'] }),
  reference_id: text('reference_id'),
  status: text('status', {
    enum: ['draft', 'applied', 'issued', 'amended', 'negotiated', 'settled', 'expired', 'cancelled'],
  }).notNull().default('draft'),
  terms: text('terms'),
  documents_required: jsonb('documents_required').default([]),
  tenant_id: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LetterOfCredit = typeof letters_of_credit.$inferSelect;
export type NewLetterOfCredit = typeof letters_of_credit.$inferInsert;
