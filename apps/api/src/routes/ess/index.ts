/**
 * Employee Self-Service (ESS) routes:
 *   GET  /api/v1/ess/profile         — view own profile
 *   PUT  /api/v1/ess/profile         — update personal info
 *   GET  /api/v1/ess/payslips        — view own payslips
 *   GET  /api/v1/ess/payslips/:id    — payslip detail
 *   GET  /api/v1/ess/leave-balance   — view own leave balance
 *   POST /api/v1/ess/leave-request   — submit own leave request
 *   GET  /api/v1/ess/attendance      — view own attendance history
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';

/** Resolve employee ID from user's JWT sub (user_id → employee) */
async function resolveEmployeeId(fastify: FastifyInstance, userId: string, tenantId: string): Promise<string> {
  const rows = await fastify.sql`
    SELECT id FROM employees WHERE user_id = ${userId} AND tenant_id = ${tenantId} LIMIT 1
  `;
  if (!rows[0]) throw new NotFoundError({ detail: 'No employee record linked to this user.' });
  return (rows[0] as { id: string }).id;
}

export async function essRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // GET /ess/profile — view own profile
  fastify.get(
    `${API_V1_PREFIX}/ess/profile`,
    {
      schema: { description: 'View own employee profile', tags: ['ess'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const rows = await fastify.sql`
        SELECT e.*, d.name_th as department_name, p.title_th as position_title
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN positions p ON p.id = e.position_id
        WHERE e.id = ${employeeId} AND e.tenant_id = ${tenantId}
        LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Employee record not found.' });
      return reply.send(rows[0]);
    },
  );

  // PUT /ess/profile — update personal info (limited fields)
  fastify.put<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/ess/profile`,
    {
      schema: { description: 'Update own personal info', tags: ['ess'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const b = request.body;
      await fastify.sql`
        UPDATE employees SET
          phone = COALESCE(${(b['phone'] as string) ?? null}, phone),
          email = COALESCE(${(b['email'] as string) ?? null}, email),
          address = COALESCE(${(b['address'] as string) ?? null}, address)
        WHERE id = ${employeeId} AND tenant_id = ${tenantId}
      `;
      const rows = await fastify.sql`
        SELECT * FROM employees WHERE id = ${employeeId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      return reply.send(rows[0]);
    },
  );

  // GET /ess/payslips — view own payslips
  fastify.get(
    `${API_V1_PREFIX}/ess/payslips`,
    {
      schema: { description: 'View own payslips', tags: ['ess'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const rows = await fastify.sql`
        SELECT ps.* FROM payslips ps
        JOIN payroll_runs pr ON pr.id = ps.payroll_run_id
        WHERE ps.employee_id = ${employeeId} AND pr.tenant_id = ${tenantId}
        ORDER BY pr.period_start DESC
      `;
      return reply.send(rows);
    },
  );

  // GET /ess/payslips/:id
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/ess/payslips/:id`,
    {
      schema: { description: 'View payslip detail', tags: ['ess'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const rows = await fastify.sql`
        SELECT ps.* FROM payslips ps
        JOIN payroll_runs pr ON pr.id = ps.payroll_run_id
        WHERE ps.id = ${request.params.id}
          AND ps.employee_id = ${employeeId}
          AND pr.tenant_id = ${tenantId}
        LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Payslip not found.' });
      return reply.send(rows[0]);
    },
  );

  // GET /ess/leave-balance
  fastify.get(
    `${API_V1_PREFIX}/ess/leave-balance`,
    {
      schema: { description: 'View own leave balance', tags: ['ess'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const rows = await fastify.sql`
        SELECT lt.name_th, lt.name_en,
               COALESCE(lb.entitled_days, 0) as entitled_days,
               COALESCE(lb.used_days, 0) as used_days,
               COALESCE(lb.entitled_days, 0) - COALESCE(lb.used_days, 0) as remaining_days
        FROM leave_types lt
        LEFT JOIN leave_balances lb ON lb.leave_type_id = lt.id AND lb.employee_id = ${employeeId}
        WHERE lt.tenant_id = ${tenantId}
        ORDER BY lt.name_th
      `;
      return reply.send(rows);
    },
  );

  // POST /ess/leave-request — submit own leave request
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/ess/leave-request`,
    {
      schema: { description: 'Submit own leave request', tags: ['ess'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const b = request.body;
      if (!b['leaveTypeId']) throw new ValidationError({ detail: 'leaveTypeId is required.' });
      if (!b['startDate']) throw new ValidationError({ detail: 'startDate is required.' });
      if (!b['endDate']) throw new ValidationError({ detail: 'endDate is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days, reason, status, tenant_id)
        VALUES (${id}, ${employeeId}, ${b['leaveTypeId'] as string},
                ${b['startDate'] as string}, ${b['endDate'] as string},
                ${(b['days'] as number) ?? 1}, ${(b['reason'] as string) ?? null},
                'pending', ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM leave_requests WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  // GET /ess/attendance — view own attendance history
  fastify.get(
    `${API_V1_PREFIX}/ess/attendance`,
    {
      schema: { description: 'View own attendance history', tags: ['ess'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const { month } = request.query as Record<string, string | undefined>;
      if (month) {
        const rows = await fastify.sql`
          SELECT * FROM attendance_records
          WHERE employee_id = ${employeeId} AND tenant_id = ${tenantId}
            AND to_char(date, 'YYYY-MM') = ${month}
          ORDER BY date DESC
        `;
        return reply.send(rows);
      }
      const rows = await fastify.sql`
        SELECT * FROM attendance_records
        WHERE employee_id = ${employeeId} AND tenant_id = ${tenantId}
        ORDER BY date DESC
        LIMIT 100
      `;
      return reply.send(rows);
    },
  );
}
