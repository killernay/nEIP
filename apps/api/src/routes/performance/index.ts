/**
 * Performance & Goals + Compensation + Benefits routes:
 *   POST /api/v1/performance/reviews           — create review
 *   GET  /api/v1/performance/reviews            — list
 *   GET  /api/v1/performance/reviews/:id        — detail with goals
 *   PUT  /api/v1/performance/reviews/:id        — update
 *   POST /api/v1/performance/reviews/:id/submit — submit
 *   POST /api/v1/performance/reviews/:id/complete — complete
 *   POST /api/v1/performance/goals              — add goal
 *   PUT  /api/v1/performance/goals/:id          — update goal
 *   POST /api/v1/hr/compensation/propose        — propose compensation change
 *   GET  /api/v1/hr/compensation                — list changes
 *   POST /api/v1/hr/compensation/:id/approve    — approve
 *   POST /api/v1/hr/benefits                    — create enrollment
 *   GET  /api/v1/hr/benefits                    — list benefits
 *   GET  /api/v1/hr/benefits/:id                — detail
 *   PUT  /api/v1/hr/benefits/:id                — update
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  HR_PERFORMANCE_CREATE, HR_PERFORMANCE_READ, HR_PERFORMANCE_UPDATE,
  HR_COMPENSATION_CREATE, HR_COMPENSATION_READ, HR_COMPENSATION_APPROVE,
  HR_BENEFIT_CREATE, HR_BENEFIT_READ, HR_BENEFIT_UPDATE,
} from '../../lib/permissions.js';

export async function performanceRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // ---- Performance Reviews ----

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/performance/reviews`,
    {
      schema: { description: 'Create performance review', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_PERFORMANCE_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['employeeId']) throw new ValidationError({ detail: 'employeeId is required.' });
      if (!b['reviewerId']) throw new ValidationError({ detail: 'reviewerId is required.' });
      if (!b['reviewPeriod']) throw new ValidationError({ detail: 'reviewPeriod is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO performance_reviews (id, employee_id, reviewer_id, review_period, status, tenant_id)
        VALUES (${id}, ${b['employeeId'] as string}, ${b['reviewerId'] as string},
                ${b['reviewPeriod'] as string}, 'draft', ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM performance_reviews WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/performance/reviews`,
    {
      schema: { description: 'List performance reviews', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_PERFORMANCE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { employeeId, status } = request.query as Record<string, string | undefined>;
      let q = `SELECT pr.*, e.first_name_th, e.last_name_th FROM performance_reviews pr
               JOIN employees e ON e.id = pr.employee_id WHERE pr.tenant_id = $1`;
      const p: unknown[] = [tenantId];
      if (employeeId) { q += ` AND pr.employee_id = $${p.length + 1}`; p.push(employeeId); }
      if (status) { q += ` AND pr.status = $${p.length + 1}`; p.push(status); }
      q += ` ORDER BY pr.created_at DESC`;
      return reply.send(await fastify.sql.unsafe(q, p as (string | number | boolean | null)[]));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/performance/reviews/:id`,
    {
      schema: { description: 'Performance review detail with goals', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_PERFORMANCE_READ)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM performance_reviews WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Review not found.' });
      const goals = await fastify.sql`
        SELECT * FROM performance_goals WHERE review_id = ${request.params.id} ORDER BY created_at
      `;
      return reply.send({ ...rows[0], goals });
    },
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/performance/reviews/:id`,
    {
      schema: { description: 'Update performance review', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_PERFORMANCE_UPDATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const res = await fastify.sql`
        UPDATE performance_reviews SET
          overall_rating = COALESCE(${(b['overallRating'] as number) ?? null}, overall_rating),
          comments = COALESCE(${(b['comments'] as string) ?? null}, comments)
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId}
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Review not found.' });
      return reply.send(res[0]);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/performance/reviews/:id/submit`,
    {
      schema: { description: 'Submit review for manager review', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_PERFORMANCE_UPDATE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE performance_reviews SET status = 'manager_review'
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId}
          AND status IN ('draft','self_review')
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Review not found or wrong status.' });
      return reply.send(res[0]);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/performance/reviews/:id/complete`,
    {
      schema: { description: 'Complete performance review', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_PERFORMANCE_UPDATE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE performance_reviews SET status = 'completed'
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} AND status = 'manager_review'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Review not found or not in manager_review.' });
      return reply.send(res[0]);
    },
  );

  // ---- Goals ----

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/performance/goals`,
    {
      schema: { description: 'Add performance goal', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_PERFORMANCE_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      if (!b['reviewId']) throw new ValidationError({ detail: 'reviewId is required.' });
      if (!b['goalDescription']) throw new ValidationError({ detail: 'goalDescription is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO performance_goals (id, review_id, goal_description, target, weight_percent, tenant_id)
        VALUES (${id}, ${b['reviewId'] as string}, ${b['goalDescription'] as string},
                ${(b['target'] as string) ?? null}, ${(b['weightPercent'] as number) ?? 0}, ${request.user.tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM performance_goals WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/performance/goals/:id`,
    {
      schema: { description: 'Update performance goal', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_PERFORMANCE_UPDATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const res = await fastify.sql`
        UPDATE performance_goals SET
          actual = COALESCE(${(b['actual'] as string) ?? null}, actual),
          rating = COALESCE(${(b['rating'] as number) ?? null}, rating),
          weight_percent = COALESCE(${(b['weightPercent'] as number) ?? null}, weight_percent)
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId}
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Goal not found.' });
      return reply.send(res[0]);
    },
  );

  // ---- Compensation ----

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/hr/compensation/propose`,
    {
      schema: { description: 'Propose compensation change', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_COMPENSATION_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['employeeId']) throw new ValidationError({ detail: 'employeeId is required.' });
      if (!b['changeType']) throw new ValidationError({ detail: 'changeType is required.' });
      if (!b['newSalarySatang']) throw new ValidationError({ detail: 'newSalarySatang is required.' });

      // Get current salary
      const empRows = await fastify.sql`
        SELECT base_salary_satang FROM employees WHERE id = ${b['employeeId'] as string} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const oldSalary = empRows[0] ? (empRows[0] as Record<string, unknown>)['base_salary_satang'] as number : null;

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO compensation_changes (id, employee_id, change_type, effective_date,
          old_salary_satang, new_salary_satang, reason, status, tenant_id)
        VALUES (${id}, ${b['employeeId'] as string}, ${b['changeType'] as string},
                ${(b['effectiveDate'] as string) ?? new Date().toISOString().substring(0, 10)},
                ${oldSalary}, ${b['newSalarySatang'] as number},
                ${(b['reason'] as string) ?? null}, 'pending', ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM compensation_changes WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/hr/compensation`,
    {
      schema: { description: 'List compensation changes', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_COMPENSATION_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql`
        SELECT cc.*, e.first_name_th, e.last_name_th
        FROM compensation_changes cc
        JOIN employees e ON e.id = cc.employee_id
        WHERE cc.tenant_id = ${tenantId}
        ORDER BY cc.created_at DESC
      `;
      return reply.send(rows);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/hr/compensation/:id/approve`,
    {
      schema: { description: 'Approve compensation change', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_COMPENSATION_APPROVE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const res = await fastify.sql`
        UPDATE compensation_changes SET status = 'approved', approved_by = ${request.user.sub}
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'pending'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Compensation change not found or not pending.' });

      // Auto-update employee salary
      const change = res[0] as Record<string, unknown>;
      await fastify.sql`
        UPDATE employees SET base_salary_satang = ${change['new_salary_satang'] as number}
        WHERE id = ${change['employee_id'] as string} AND tenant_id = ${tenantId}
      `;
      return reply.send(res[0]);
    },
  );

  // ---- Benefits ----

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/hr/benefits`,
    {
      schema: { description: 'Create benefit enrollment', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_BENEFIT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['employeeId']) throw new ValidationError({ detail: 'employeeId is required.' });
      if (!b['benefitType']) throw new ValidationError({ detail: 'benefitType is required.' });
      if (!b['startDate']) throw new ValidationError({ detail: 'startDate is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO employee_benefits (id, employee_id, benefit_type, provider, policy_number,
          coverage_amount_satang, employer_contribution_satang, employee_contribution_satang,
          start_date, end_date, tenant_id)
        VALUES (${id}, ${b['employeeId'] as string}, ${b['benefitType'] as string},
                ${(b['provider'] as string) ?? null}, ${(b['policyNumber'] as string) ?? null},
                ${(b['coverageAmountSatang'] as number) ?? 0},
                ${(b['employerContributionSatang'] as number) ?? 0},
                ${(b['employeeContributionSatang'] as number) ?? 0},
                ${b['startDate'] as string}, ${(b['endDate'] as string) ?? null}, ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM employee_benefits WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/hr/benefits`,
    {
      schema: { description: 'List employee benefits', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_BENEFIT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { employeeId } = request.query as Record<string, string | undefined>;
      let q = `SELECT eb.*, e.first_name_th, e.last_name_th FROM employee_benefits eb
               JOIN employees e ON e.id = eb.employee_id WHERE eb.tenant_id = $1`;
      const p: unknown[] = [tenantId];
      if (employeeId) { q += ` AND eb.employee_id = $${p.length + 1}`; p.push(employeeId); }
      q += ` ORDER BY eb.start_date DESC`;
      return reply.send(await fastify.sql.unsafe(q, p as (string | number | boolean | null)[]));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/hr/benefits/:id`,
    {
      schema: { description: 'Benefit detail', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_BENEFIT_READ)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM employee_benefits WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Benefit not found.' });
      return reply.send(rows[0]);
    },
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/hr/benefits/:id`,
    {
      schema: { description: 'Update benefit', tags: ['hr'] },
      preHandler: [requireAuth, requirePermission(HR_BENEFIT_UPDATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const res = await fastify.sql`
        UPDATE employee_benefits SET
          provider = COALESCE(${(b['provider'] as string) ?? null}, provider),
          policy_number = COALESCE(${(b['policyNumber'] as string) ?? null}, policy_number),
          coverage_amount_satang = COALESCE(${(b['coverageAmountSatang'] as number) ?? null}, coverage_amount_satang),
          employer_contribution_satang = COALESCE(${(b['employerContributionSatang'] as number) ?? null}, employer_contribution_satang),
          employee_contribution_satang = COALESCE(${(b['employeeContributionSatang'] as number) ?? null}, employee_contribution_satang),
          end_date = COALESCE(${(b['endDate'] as string) ?? null}, end_date)
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId}
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Benefit not found.' });
      return reply.send(res[0]);
    },
  );
}
