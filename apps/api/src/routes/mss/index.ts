/**
 * Manager Self-Service (MSS) routes:
 *   GET  /api/v1/mss/team                    — list direct reports
 *   GET  /api/v1/mss/team/:id/details        — team member detail
 *   GET  /api/v1/mss/pending-approvals       — pending approvals from team
 *   POST /api/v1/mss/approve/:type/:id       — approve request
 *   POST /api/v1/mss/reject/:type/:id        — reject request
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { MSS_TEAM_READ, MSS_APPROVAL_MANAGE } from '../../lib/permissions.js';

/** Resolve employee ID from user's JWT sub */
async function resolveEmployeeId(fastify: FastifyInstance, userId: string, tenantId: string): Promise<string> {
  const rows = await fastify.sql`
    SELECT id FROM employees WHERE user_id = ${userId} AND tenant_id = ${tenantId} LIMIT 1
  `;
  if (!rows[0]) throw new NotFoundError({ detail: 'No employee record linked to this user.' });
  return (rows[0] as { id: string }).id;
}

export async function mssRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // GET /mss/team — list direct reports
  fastify.get(
    `${API_V1_PREFIX}/mss/team`,
    {
      schema: { description: 'List direct reports', tags: ['mss'] },
      preHandler: [requireAuth, requirePermission(MSS_TEAM_READ)],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const rows = await fastify.sql`
        SELECT e.id, e.employee_code, e.first_name_th, e.last_name_th,
               e.first_name_en, e.last_name_en, e.email, e.phone,
               d.name_th as department_name, p.title_th as position_title,
               e.status, e.hire_date
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN positions p ON p.id = e.position_id
        WHERE e.manager_id = ${employeeId} AND e.tenant_id = ${tenantId}
        ORDER BY e.first_name_th
      `;
      return reply.send(rows);
    },
  );

  // GET /mss/team/:id/details — team member detail
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/mss/team/:id/details`,
    {
      schema: { description: 'View team member details', tags: ['mss'] },
      preHandler: [requireAuth, requirePermission(MSS_TEAM_READ)],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const rows = await fastify.sql`
        SELECT e.*, d.name_th as department_name, p.title_th as position_title
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN positions p ON p.id = e.position_id
        WHERE e.id = ${request.params.id}
          AND e.manager_id = ${employeeId}
          AND e.tenant_id = ${tenantId}
        LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Team member not found.' });
      return reply.send(rows[0]);
    },
  );

  // GET /mss/pending-approvals — pending leave requests + expense claims from team
  fastify.get(
    `${API_V1_PREFIX}/mss/pending-approvals`,
    {
      schema: { description: 'List pending approvals from team', tags: ['mss'] },
      preHandler: [requireAuth, requirePermission(MSS_APPROVAL_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const employeeId = await resolveEmployeeId(fastify, sub, tenantId);

      const leaveRows = await fastify.sql`
        SELECT lr.id, 'leave' as type, lr.start_date, lr.end_date, lr.days, lr.reason,
               lr.status, lr.created_at,
               e.first_name_th, e.last_name_th, e.employee_code
        FROM leave_requests lr
        JOIN employees e ON e.id = lr.employee_id
        WHERE e.manager_id = ${employeeId}
          AND lr.status = 'pending'
          AND lr.tenant_id = ${tenantId}
        ORDER BY lr.created_at
      `;

      const expenseRows = await fastify.sql`
        SELECT ec.id, 'expense' as type, ec.total_amount_satang,
               ec.status, ec.created_at,
               e.first_name_th, e.last_name_th, e.employee_code
        FROM expense_claims ec
        JOIN employees e ON e.id = ec.employee_id
        WHERE e.manager_id = ${employeeId}
          AND ec.status = 'submitted'
          AND ec.tenant_id = ${tenantId}
        ORDER BY ec.created_at
      `;

      return reply.send({ leave: leaveRows, expense: expenseRows });
    },
  );

  // POST /mss/approve/:type/:id
  fastify.post<{ Params: { type: string; id: string } }>(
    `${API_V1_PREFIX}/mss/approve/:type/:id`,
    {
      schema: { description: 'Approve a team request', tags: ['mss'] },
      preHandler: [requireAuth, requirePermission(MSS_APPROVAL_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const { type, id } = request.params;

      if (type === 'leave') {
        const res = await fastify.sql`
          UPDATE leave_requests SET status = 'approved', approved_by = ${sub}
          WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending'
          RETURNING *
        `;
        if (!res[0]) throw new NotFoundError({ detail: 'Leave request not found or already processed.' });
        return reply.send(res[0]);
      } else if (type === 'expense') {
        const res = await fastify.sql`
          UPDATE expense_claims SET status = 'approved', approved_by = ${sub}
          WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'submitted'
          RETURNING *
        `;
        if (!res[0]) throw new NotFoundError({ detail: 'Expense claim not found or already processed.' });
        return reply.send(res[0]);
      }
      throw new ValidationError({ detail: `Unknown approval type: ${type}. Use 'leave' or 'expense'.` });
    },
  );

  // POST /mss/reject/:type/:id
  fastify.post<{ Params: { type: string; id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/mss/reject/:type/:id`,
    {
      schema: { description: 'Reject a team request', tags: ['mss'] },
      preHandler: [requireAuth, requirePermission(MSS_APPROVAL_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId, sub } = request.user;
      const { type, id } = request.params;

      if (type === 'leave') {
        const res = await fastify.sql`
          UPDATE leave_requests SET status = 'rejected', approved_by = ${sub}
          WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'pending'
          RETURNING *
        `;
        if (!res[0]) throw new NotFoundError({ detail: 'Leave request not found or already processed.' });
        return reply.send(res[0]);
      } else if (type === 'expense') {
        const res = await fastify.sql`
          UPDATE expense_claims SET status = 'rejected', approved_by = ${sub}
          WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'submitted'
          RETURNING *
        `;
        if (!res[0]) throw new NotFoundError({ detail: 'Expense claim not found or already processed.' });
        return reply.send(res[0]);
      }
      throw new ValidationError({ detail: `Unknown rejection type: ${type}. Use 'leave' or 'expense'.` });
    },
  );
}
