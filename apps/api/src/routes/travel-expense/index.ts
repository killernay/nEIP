/**
 * Travel & Expense Management routes:
 *   POST /api/v1/travel-requests              — create travel request
 *   GET  /api/v1/travel-requests              — list travel requests
 *   GET  /api/v1/travel-requests/:id          — detail
 *   PUT  /api/v1/travel-requests/:id          — update
 *   POST /api/v1/travel-requests/:id/submit   — submit for approval
 *   POST /api/v1/travel-requests/:id/approve  — approve
 *   POST /api/v1/travel-requests/:id/reject   — reject
 *   POST /api/v1/expense-claims               — create expense claim
 *   GET  /api/v1/expense-claims               — list expense claims
 *   GET  /api/v1/expense-claims/:id           — detail (with lines)
 *   POST /api/v1/expense-claims/:id/submit    — submit
 *   POST /api/v1/expense-claims/:id/approve   — approve
 *   POST /api/v1/expense-claims/:id/settle    — settle (create AP/payroll)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  HR_TRAVEL_CREATE, HR_TRAVEL_READ, HR_TRAVEL_APPROVE,
  HR_EXPENSE_CREATE, HR_EXPENSE_READ, HR_EXPENSE_APPROVE,
} from '../../lib/permissions.js';

export async function travelExpenseRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // ---- Travel Requests ----

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/travel-requests`,
    {
      schema: { description: 'Create travel request', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_TRAVEL_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['employeeId']) throw new ValidationError({ detail: 'employeeId is required.' });
      if (!b['destination']) throw new ValidationError({ detail: 'destination is required.' });
      if (!b['departureDate']) throw new ValidationError({ detail: 'departureDate is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO travel_requests (id, employee_id, destination, purpose,
          departure_date, return_date, estimated_cost_satang, advance_amount_satang, status, tenant_id)
        VALUES (${id}, ${b['employeeId'] as string}, ${b['destination'] as string},
          ${(b['purpose'] as string) ?? ''}, ${b['departureDate'] as string},
          ${(b['returnDate'] as string) ?? b['departureDate'] as string},
          ${(b['estimatedCostSatang'] as number) ?? 0},
          ${(b['advanceAmountSatang'] as number) ?? 0}, 'draft', ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM travel_requests WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/travel-requests`,
    {
      schema: { description: 'List travel requests', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_TRAVEL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { status, employeeId } = request.query as Record<string, string | undefined>;
      let q = `SELECT tr.*, e.first_name_th, e.last_name_th FROM travel_requests tr
               JOIN employees e ON e.id = tr.employee_id WHERE tr.tenant_id = $1`;
      const p: unknown[] = [tenantId];
      if (status) { q += ` AND tr.status = $${p.length + 1}`; p.push(status); }
      if (employeeId) { q += ` AND tr.employee_id = $${p.length + 1}`; p.push(employeeId); }
      q += ` ORDER BY tr.created_at DESC`;
      const rows = await fastify.sql.unsafe(q, p as (string | number | boolean | null)[]);
      return reply.send(rows);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/travel-requests/:id`,
    {
      schema: { description: 'Travel request detail', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_TRAVEL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql`
        SELECT * FROM travel_requests WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Travel request not found.' });
      return reply.send(rows[0]);
    },
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/travel-requests/:id`,
    {
      schema: { description: 'Update travel request', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_TRAVEL_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      const res = await fastify.sql`
        UPDATE travel_requests SET
          destination = COALESCE(${(b['destination'] as string) ?? null}, destination),
          purpose = COALESCE(${(b['purpose'] as string) ?? null}, purpose),
          departure_date = COALESCE(${(b['departureDate'] as string) ?? null}, departure_date),
          return_date = COALESCE(${(b['returnDate'] as string) ?? null}, return_date),
          estimated_cost_satang = COALESCE(${(b['estimatedCostSatang'] as number) ?? null}, estimated_cost_satang),
          advance_amount_satang = COALESCE(${(b['advanceAmountSatang'] as number) ?? null}, advance_amount_satang)
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Travel request not found or not editable.' });
      return reply.send(res[0]);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/travel-requests/:id/submit`,
    {
      schema: { description: 'Submit travel request', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_TRAVEL_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const res = await fastify.sql`
        UPDATE travel_requests SET status = 'submitted'
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Travel request not found or not in draft.' });
      return reply.send(res[0]);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/travel-requests/:id/approve`,
    {
      schema: { description: 'Approve travel request', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_TRAVEL_APPROVE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE travel_requests SET status = 'approved', approved_by = ${request.user.sub}
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} AND status = 'submitted'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Travel request not found or not submitted.' });
      return reply.send(res[0]);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/travel-requests/:id/reject`,
    {
      schema: { description: 'Reject travel request', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_TRAVEL_APPROVE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE travel_requests SET status = 'rejected', approved_by = ${request.user.sub}
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} AND status = 'submitted'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Travel request not found or not submitted.' });
      return reply.send(res[0]);
    },
  );

  // ---- Expense Claims ----

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/expense-claims`,
    {
      schema: { description: 'Create expense claim', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_EXPENSE_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['employeeId']) throw new ValidationError({ detail: 'employeeId is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO expense_claims (id, travel_request_id, employee_id, total_amount_satang, status, tenant_id)
        VALUES (${id}, ${(b['travelRequestId'] as string) ?? null}, ${b['employeeId'] as string}, 0, 'draft', ${tenantId})
      `;

      // Insert lines if provided
      const lines = (b['lines'] as Array<Record<string, unknown>>) ?? [];
      let total = 0;
      for (const line of lines) {
        const lineId = crypto.randomUUID();
        const amt = (line['amountSatang'] as number) ?? 0;
        total += amt;
        await fastify.sql`
          INSERT INTO expense_lines (id, claim_id, date, category, description, amount_satang, receipt_number, vat_satang, tenant_id)
          VALUES (${lineId}, ${id}, ${line['date'] as string}, ${(line['category'] as string) ?? 'other'},
                  ${(line['description'] as string) ?? null}, ${amt},
                  ${(line['receiptNumber'] as string) ?? null}, ${(line['vatSatang'] as number) ?? 0}, ${tenantId})
        `;
      }
      if (total > 0) {
        await fastify.sql`UPDATE expense_claims SET total_amount_satang = ${total} WHERE id = ${id}`;
      }

      const rows = await fastify.sql`SELECT * FROM expense_claims WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/expense-claims`,
    {
      schema: { description: 'List expense claims', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_EXPENSE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { status } = request.query as Record<string, string | undefined>;
      let q = `SELECT ec.*, e.first_name_th, e.last_name_th FROM expense_claims ec
               JOIN employees e ON e.id = ec.employee_id WHERE ec.tenant_id = $1`;
      const p: unknown[] = [tenantId];
      if (status) { q += ` AND ec.status = $${p.length + 1}`; p.push(status); }
      q += ` ORDER BY ec.created_at DESC`;
      const rows = await fastify.sql.unsafe(q, p as (string | number | boolean | null)[]);
      return reply.send(rows);
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/expense-claims/:id`,
    {
      schema: { description: 'Expense claim detail with lines', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_EXPENSE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const claimRows = await fastify.sql`
        SELECT * FROM expense_claims WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!claimRows[0]) throw new NotFoundError({ detail: 'Expense claim not found.' });
      const lines = await fastify.sql`
        SELECT * FROM expense_lines WHERE claim_id = ${request.params.id} ORDER BY date
      `;
      return reply.send({ ...claimRows[0], lines });
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/expense-claims/:id/submit`,
    {
      schema: { description: 'Submit expense claim', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_EXPENSE_CREATE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE expense_claims SET status = 'submitted'
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} AND status = 'draft'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Expense claim not found or not in draft.' });
      return reply.send(res[0]);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/expense-claims/:id/approve`,
    {
      schema: { description: 'Approve expense claim', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_EXPENSE_APPROVE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE expense_claims SET status = 'approved', approved_by = ${request.user.sub}
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} AND status = 'submitted'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Expense claim not found or not submitted.' });
      return reply.send(res[0]);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/expense-claims/:id/settle`,
    {
      schema: { description: 'Settle expense claim (mark as paid)', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_EXPENSE_APPROVE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE expense_claims SET status = 'paid'
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} AND status = 'approved'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Expense claim not found or not approved.' });
      return reply.send(res[0]);
    },
  );
}
