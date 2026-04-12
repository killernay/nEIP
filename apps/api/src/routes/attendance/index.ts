/**
 * HR Attendance Tracking routes:
 *   POST /api/v1/attendance/clock-in                — clock in
 *   POST /api/v1/attendance/clock-out               — clock out
 *   GET  /api/v1/attendance/daily/:employeeId       — daily summary
 *   GET  /api/v1/attendance/monthly/:employeeId     — monthly summary
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';

const HR_ATTENDANCE_CREATE = 'hr:attendance:create' as const;
const HR_ATTENDANCE_READ   = 'hr:attendance:read'   as const;

interface AttendanceRow {
  id: string; employee_id: string; date: string;
  clock_in: Date | string | null; clock_out: Date | string | null;
  hours_worked: number; overtime_hours: number;
  status: string; notes: string | null;
  tenant_id: string;
  created_at: Date | string; updated_at: Date | string;
}

function mapAttendance(r: AttendanceRow) {
  return {
    id: r.id, employeeId: r.employee_id, date: r.date,
    clockIn: r.clock_in ? toISO(r.clock_in) : null,
    clockOut: r.clock_out ? toISO(r.clock_out) : null,
    hoursWorked: Number(r.hours_worked),
    overtimeHours: Number(r.overtime_hours),
    status: r.status, notes: r.notes,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

export async function attendanceRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /attendance/clock-in
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/attendance/clock-in`,
    {
      schema: { description: 'บันทึกเวลาเข้างาน — Clock in', tags: ['hr'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_ATTENDANCE_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const employeeId = b['employeeId'] as string;
      if (!employeeId) throw new ValidationError({ detail: 'employeeId is required.' });

      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();

      // Check if already clocked in today
      const existing = await fastify.sql<[AttendanceRow?]>`
        SELECT * FROM attendance_records WHERE employee_id = ${employeeId} AND date = ${today} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (existing[0] && existing[0].clock_in) {
        throw new ConflictError({ detail: `Employee already clocked in today at ${toISO(existing[0].clock_in)}.` });
      }

      // Determine status: late if after 09:00
      const hour = now.getHours();
      const status = hour >= 9 ? 'late' : 'present';

      if (existing[0]) {
        // Update existing record
        const rows = await fastify.sql<[AttendanceRow]>`
          UPDATE attendance_records SET clock_in = ${now.toISOString()}, status = ${status}, updated_at = NOW()
          WHERE id = ${existing[0].id} AND tenant_id = ${tenantId} RETURNING *
        `;
        return reply.status(200).send(mapAttendance(rows[0]));
      }

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO attendance_records (id, employee_id, date, clock_in, status, tenant_id)
        VALUES (${id}, ${employeeId}, ${today}, ${now.toISOString()}, ${status}, ${tenantId})
      `;

      const rows = await fastify.sql<[AttendanceRow]>`SELECT * FROM attendance_records WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(mapAttendance(rows[0]));
    },
  );

  // POST /attendance/clock-out
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/attendance/clock-out`,
    {
      schema: { description: 'บันทึกเวลาออกงาน — Clock out', tags: ['hr'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_ATTENDANCE_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const employeeId = b['employeeId'] as string;
      if (!employeeId) throw new ValidationError({ detail: 'employeeId is required.' });

      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();

      const existing = await fastify.sql<[AttendanceRow?]>`
        SELECT * FROM attendance_records WHERE employee_id = ${employeeId} AND date = ${today} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `No clock-in record found for today. Please clock in first.` });
      if (!existing[0].clock_in) throw new ValidationError({ detail: 'Employee has not clocked in yet.' });
      if (existing[0].clock_out) throw new ConflictError({ detail: 'Employee already clocked out today.' });

      // Calculate hours worked and overtime
      const clockInTime = new Date(existing[0].clock_in as string).getTime();
      const clockOutTime = now.getTime();
      const hoursWorked = Math.round(((clockOutTime - clockInTime) / (1000 * 60 * 60)) * 100) / 100;
      const overtimeHours = Math.max(0, Math.round((hoursWorked - 8) * 100) / 100);

      const rows = await fastify.sql<[AttendanceRow]>`
        UPDATE attendance_records SET
          clock_out = ${now.toISOString()},
          hours_worked = ${hoursWorked},
          overtime_hours = ${overtimeHours},
          updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;

      return reply.status(200).send(mapAttendance(rows[0]));
    },
  );

  // GET /attendance/daily/:employeeId
  fastify.get<{ Params: { employeeId: string }; Querystring: { date?: string } }>(
    `${API_V1_PREFIX}/attendance/daily/:employeeId`,
    {
      schema: { description: 'ดูสรุปเวลาทำงานรายวัน — Daily attendance summary', tags: ['hr'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_ATTENDANCE_READ)],
    },
    async (request, reply) => {
      const { employeeId } = request.params;
      const { tenantId } = request.user;
      const date = request.query.date ?? new Date().toISOString().slice(0, 10);

      const rows = await fastify.sql<[AttendanceRow?]>`
        SELECT * FROM attendance_records WHERE employee_id = ${employeeId} AND date = ${date} AND tenant_id = ${tenantId} LIMIT 1
      `;

      if (!rows[0]) {
        return reply.status(200).send({
          employeeId, date, status: 'absent',
          clockIn: null, clockOut: null, hoursWorked: 0, overtimeHours: 0,
        });
      }

      return reply.status(200).send(mapAttendance(rows[0]));
    },
  );

  // GET /attendance/monthly/:employeeId
  fastify.get<{ Params: { employeeId: string }; Querystring: { year?: string; month?: string } }>(
    `${API_V1_PREFIX}/attendance/monthly/:employeeId`,
    {
      schema: { description: 'ดูสรุปเวลาทำงานรายเดือน — Monthly attendance summary', tags: ['hr'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_ATTENDANCE_READ)],
    },
    async (request, reply) => {
      const { employeeId } = request.params;
      const { tenantId } = request.user;
      const now = new Date();
      const year = parseInt(request.query.year ?? String(now.getFullYear()), 10);
      const month = parseInt(request.query.month ?? String(now.getMonth() + 1), 10);

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      const rows = await fastify.sql<AttendanceRow[]>`
        SELECT * FROM attendance_records
        WHERE employee_id = ${employeeId} AND tenant_id = ${tenantId}
          AND date >= ${startDate} AND date <= ${endDate}
        ORDER BY date
      `;

      const totalHoursWorked = rows.reduce((sum, r) => sum + Number(r.hours_worked), 0);
      const totalOvertimeHours = rows.reduce((sum, r) => sum + Number(r.overtime_hours), 0);
      const presentDays = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
      const lateDays = rows.filter((r) => r.status === 'late').length;
      const absentDays = rows.filter((r) => r.status === 'absent').length;
      const leaveDays = rows.filter((r) => r.status === 'leave').length;

      return reply.status(200).send({
        employeeId, year, month,
        totalDaysRecorded: rows.length,
        presentDays, lateDays, absentDays, leaveDays,
        totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        records: rows.map(mapAttendance),
      });
    },
  );
}
