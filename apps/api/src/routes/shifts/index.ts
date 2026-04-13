/**
 * Shift Scheduling routes:
 *   POST /api/v1/shifts                         — create shift definition
 *   GET  /api/v1/shifts                         — list shift definitions
 *   PUT  /api/v1/shifts/:id                     — update shift
 *   POST /api/v1/shifts/assign                  — assign shift to employee
 *   POST /api/v1/shifts/bulk-assign             — bulk assign shifts
 *   GET  /api/v1/attendance/schedule             — view schedule (week view)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  HR_SHIFT_CREATE, HR_SHIFT_READ, HR_SHIFT_UPDATE, HR_SHIFT_ASSIGN,
} from '../../lib/permissions.js';

export async function shiftRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /shifts
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/shifts`,
    {
      schema: { description: 'Create shift definition', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_SHIFT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['code']) throw new ValidationError({ detail: 'code is required.' });
      if (!b['name']) throw new ValidationError({ detail: 'name is required.' });
      if (!b['startTime']) throw new ValidationError({ detail: 'startTime is required.' });
      if (!b['endTime']) throw new ValidationError({ detail: 'endTime is required.' });

      const dup = await fastify.sql`
        SELECT id FROM shift_definitions WHERE code = ${b['code'] as string} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (dup[0]) throw new ConflictError({ detail: `Shift code ${b['code']} already exists.` });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO shift_definitions (id, code, name, start_time, end_time, break_minutes, is_night_shift, tenant_id)
        VALUES (${id}, ${b['code'] as string}, ${b['name'] as string},
                ${b['startTime'] as string}, ${b['endTime'] as string},
                ${(b['breakMinutes'] as number) ?? 60}, ${(b['isNightShift'] as boolean) ?? false}, ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM shift_definitions WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  // GET /shifts
  fastify.get(
    `${API_V1_PREFIX}/shifts`,
    {
      schema: { description: 'List shift definitions', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_SHIFT_READ)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM shift_definitions WHERE tenant_id = ${request.user.tenantId} ORDER BY code
      `;
      return reply.send(rows);
    },
  );

  // PUT /shifts/:id
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/shifts/:id`,
    {
      schema: { description: 'Update shift definition', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_SHIFT_UPDATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const res = await fastify.sql`
        UPDATE shift_definitions SET
          name = COALESCE(${(b['name'] as string) ?? null}, name),
          start_time = COALESCE(${(b['startTime'] as string) ?? null}, start_time),
          end_time = COALESCE(${(b['endTime'] as string) ?? null}, end_time),
          break_minutes = COALESCE(${(b['breakMinutes'] as number) ?? null}, break_minutes),
          is_night_shift = COALESCE(${(b['isNightShift'] as boolean) ?? null}, is_night_shift)
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId}
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Shift not found.' });
      return reply.send(res[0]);
    },
  );

  // POST /shifts/assign
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/shifts/assign`,
    {
      schema: { description: 'Assign shift to employee', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_SHIFT_ASSIGN)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['employeeId']) throw new ValidationError({ detail: 'employeeId is required.' });
      if (!b['shiftId']) throw new ValidationError({ detail: 'shiftId is required.' });
      if (!b['date']) throw new ValidationError({ detail: 'date is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO employee_shifts (id, employee_id, date, shift_id, tenant_id)
        VALUES (${id}, ${b['employeeId'] as string}, ${b['date'] as string}, ${b['shiftId'] as string}, ${tenantId})
        ON CONFLICT (employee_id, date, tenant_id) DO UPDATE SET shift_id = ${b['shiftId'] as string}
      `;
      const rows = await fastify.sql`SELECT * FROM employee_shifts WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0] ?? { id, employeeId: b['employeeId'], date: b['date'], shiftId: b['shiftId'] });
    },
  );

  // POST /shifts/bulk-assign
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/shifts/bulk-assign`,
    {
      schema: { description: 'Bulk assign shifts', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_SHIFT_ASSIGN)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const assignments = (request.body as Record<string, unknown>)['assignments'] as Array<Record<string, unknown>> | undefined;
      if (!assignments || !Array.isArray(assignments)) throw new ValidationError({ detail: 'assignments array is required.' });

      let count = 0;
      for (const a of assignments) {
        const id = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO employee_shifts (id, employee_id, date, shift_id, tenant_id)
          VALUES (${id}, ${a['employeeId'] as string}, ${a['date'] as string}, ${a['shiftId'] as string}, ${tenantId})
          ON CONFLICT (employee_id, date, tenant_id) DO UPDATE SET shift_id = ${a['shiftId'] as string}
        `;
        count++;
      }
      return reply.status(201).send({ assigned: count });
    },
  );

  // GET /attendance/schedule
  fastify.get(
    `${API_V1_PREFIX}/attendance/schedule`,
    {
      schema: { description: 'View weekly schedule', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_SHIFT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { week, employeeId } = request.query as Record<string, string | undefined>;

      let q = `SELECT es.*, sd.code as shift_code, sd.name as shift_name,
               sd.start_time, sd.end_time, e.first_name_th, e.last_name_th
               FROM employee_shifts es
               JOIN shift_definitions sd ON sd.id = es.shift_id
               JOIN employees e ON e.id = es.employee_id
               WHERE es.tenant_id = $1`;
      const p: unknown[] = [tenantId];

      if (week) {
        // week format: YYYY-WW → extract date range
        q += ` AND to_char(es.date, 'IYYY-IW') = $${p.length + 1}`;
        p.push(week);
      }
      if (employeeId) {
        q += ` AND es.employee_id = $${p.length + 1}`;
        p.push(employeeId);
      }
      q += ` ORDER BY es.date, e.first_name_th`;
      return reply.send(await fastify.sql.unsafe(q, p as (string | number | boolean | null)[]));
    },
  );
}
