import { pgTable, text, date, numeric, timestamp, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';
import { employees } from './employees.js';

/**
 * attendance_records — HR attendance tracking.
 */
export const attendance_records = pgTable('attendance_records', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id')
    .notNull()
    .references(() => employees.id),
  date: date('date').notNull(),
  clock_in: timestamp('clock_in', { withTimezone: true }),
  clock_out: timestamp('clock_out', { withTimezone: true }),
  hours_worked: numeric('hours_worked', { precision: 5, scale: 2 }).default('0'),
  overtime_hours: numeric('overtime_hours', { precision: 5, scale: 2 }).default('0'),
  status: text('status').notNull().default('present'),
  notes: text('notes'),
  tenant_id: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.employee_id, t.date),
]);

export type AttendanceRecord = typeof attendance_records.$inferSelect;
export type NewAttendanceRecord = typeof attendance_records.$inferInsert;
