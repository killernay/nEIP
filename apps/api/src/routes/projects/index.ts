/**
 * Project System routes — Projects, Phases, Time Entries, Expenses, Profitability.
 *
 * Routes:
 *   POST /api/v1/projects                         — create project
 *   GET  /api/v1/projects                         — list projects
 *   GET  /api/v1/projects/:id                     — get project detail
 *   PUT  /api/v1/projects/:id                     — update project
 *   POST /api/v1/projects/:id/activate            — activate project
 *   POST /api/v1/projects/:id/complete            — complete project
 *   POST /api/v1/projects/:id/close               — close project
 *   POST /api/v1/projects/:id/phases              — create phase
 *   GET  /api/v1/projects/:id/phases              — list phases
 *   PUT  /api/v1/projects/:projectId/phases/:id   — update phase
 *   POST /api/v1/time-entries                     — create time entry
 *   GET  /api/v1/time-entries                     — list time entries
 *   POST /api/v1/time-entries/:id/approve         — approve time entry
 *   POST /api/v1/project-expenses                 — create expense
 *   GET  /api/v1/project-expenses                 — list expenses
 *   POST /api/v1/project-expenses/:id/approve     — approve expense
 *   GET  /api/v1/projects/:id/profitability       — profitability report
 *   GET  /api/v1/projects/:id/wip                 — work in progress
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  PS_PROJECT_CREATE,
  PS_PROJECT_READ,
  PS_PROJECT_UPDATE,
  PS_TIME_CREATE,
  PS_TIME_READ,
  PS_TIME_APPROVE,
  PS_EXPENSE_CREATE,
  PS_EXPENSE_READ,
  PS_EXPENSE_APPROVE,
} from '../../lib/permissions.js';

interface CountRow { count: string; }

export async function projectRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // =========================================================================
  // PROJECTS CRUD
  // =========================================================================

  // POST /api/v1/projects — create project
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/projects`,
    {
      schema: {
        description: 'สร้างโครงการใหม่ — Create a new project',
        tags: ['projects'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId, sub: userId } = request.user;
      const id = crypto.randomUUID();

      if (!b['code'] || !b['nameTh']) {
        throw new ValidationError({ detail: 'code and nameTh are required.' });
      }

      await fastify.sql`
        INSERT INTO projects (id, code, name_th, name_en, customer_id, project_type, status,
          budget_satang, start_date, end_date, manager_id, cost_center_id, notes, tenant_id, created_by)
        VALUES (
          ${id}, ${b['code'] as string}, ${b['nameTh'] as string},
          ${(b['nameEn'] as string | undefined) ?? null},
          ${(b['customerId'] as string | undefined) ?? null},
          ${(b['projectType'] as string | undefined) ?? 'fixed_price'},
          'planning',
          ${Number(b['budgetSatang'] ?? 0)},
          ${(b['startDate'] as string | undefined) ?? null},
          ${(b['endDate'] as string | undefined) ?? null},
          ${(b['managerId'] as string | undefined) ?? null},
          ${(b['costCenterId'] as string | undefined) ?? null},
          ${(b['notes'] as string | undefined) ?? null},
          ${tenantId}, ${userId}
        )
      `;

      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM projects WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapProject(rows[0]!));
    },
  );

  // GET /api/v1/projects — list projects
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/projects`,
    {
      schema: {
        description: 'รายการโครงการ — List projects',
        tags: ['projects'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);
      const status = request.query['status'];

      let rows: Record<string, unknown>[];
      let countRows: CountRow[];

      if (status) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM projects WHERE tenant_id = ${tenantId} AND status = ${status}`;
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM projects WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM projects WHERE tenant_id = ${tenantId}`;
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM projects WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({
        items: rows.map(mapProject),
        total, limit, offset, hasMore: offset + limit < total,
      });
    },
  );

  // GET /api/v1/projects/:id — get project detail
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/projects/:id`,
    {
      schema: {
        description: 'รายละเอียดโครงการ — Get project detail',
        tags: ['projects'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM projects WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Project ${request.params.id} not found.` });
      return reply.status(200).send(mapProject(rows[0]));
    },
  );

  // PUT /api/v1/projects/:id — update project
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/projects/:id`,
    {
      schema: {
        description: 'แก้ไขโครงการ — Update project',
        tags: ['projects'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      const { id } = request.params;

      const existing = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM projects WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Project ${id} not found.` });

      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE projects SET
          code           = COALESCE(${(b['code'] as string | undefined) ?? null}, code),
          name_th        = COALESCE(${(b['nameTh'] as string | undefined) ?? null}, name_th),
          name_en        = COALESCE(${(b['nameEn'] as string | undefined) ?? null}, name_en),
          customer_id    = COALESCE(${(b['customerId'] as string | undefined) ?? null}, customer_id),
          project_type   = COALESCE(${(b['projectType'] as string | undefined) ?? null}, project_type),
          budget_satang  = COALESCE(${b['budgetSatang'] != null ? Number(b['budgetSatang']) : null}, budget_satang),
          start_date     = COALESCE(${(b['startDate'] as string | undefined) ?? null}, start_date),
          end_date       = COALESCE(${(b['endDate'] as string | undefined) ?? null}, end_date),
          manager_id     = COALESCE(${(b['managerId'] as string | undefined) ?? null}, manager_id),
          cost_center_id = COALESCE(${(b['costCenterId'] as string | undefined) ?? null}, cost_center_id),
          notes          = COALESCE(${(b['notes'] as string | undefined) ?? null}, notes),
          updated_at     = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return reply.status(200).send(mapProject(rows[0]!));
    },
  );

  // POST /api/v1/projects/:id/activate
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/projects/:id/activate`,
    {
      schema: { description: 'Activate project', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE projects SET status = 'active', updated_at = NOW()
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'planning'
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Project not found or not in planning status.' });
      return reply.status(200).send(mapProject(rows[0]));
    },
  );

  // POST /api/v1/projects/:id/complete
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/projects/:id/complete`,
    {
      schema: { description: 'Complete project', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE projects SET status = 'completed', updated_at = NOW()
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'active'
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Project not found or not in active status.' });
      return reply.status(200).send(mapProject(rows[0]));
    },
  );

  // POST /api/v1/projects/:id/close
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/projects/:id/close`,
    {
      schema: { description: 'Close project', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE projects SET status = 'closed', updated_at = NOW()
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status IN ('completed','active')
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Project not found or cannot be closed from current status.' });
      return reply.status(200).send(mapProject(rows[0]));
    },
  );

  // =========================================================================
  // PHASES
  // =========================================================================

  // POST /api/v1/projects/:id/phases — create phase
  fastify.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/projects/:id/phases`,
    {
      schema: { description: 'Create project phase', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const projectId = request.params.id;
      const b = request.body;
      const phaseId = crypto.randomUUID();

      // Verify project exists
      const proj = await fastify.sql<Record<string, unknown>[]>`
        SELECT id FROM projects WHERE id = ${projectId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!proj[0]) throw new NotFoundError({ detail: `Project ${projectId} not found.` });

      if (!b['name']) throw new ValidationError({ detail: 'name is required.' });

      await fastify.sql`
        INSERT INTO project_phases (id, project_id, name, budget_satang, start_date, end_date, sort_order, tenant_id)
        VALUES (
          ${phaseId}, ${projectId}, ${b['name'] as string},
          ${Number(b['budgetSatang'] ?? 0)},
          ${(b['startDate'] as string | undefined) ?? null},
          ${(b['endDate'] as string | undefined) ?? null},
          ${Number(b['sortOrder'] ?? 0)},
          ${tenantId}
        )
      `;

      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM project_phases WHERE id = ${phaseId} LIMIT 1
      `;
      return reply.status(201).send(mapPhase(rows[0]!));
    },
  );

  // GET /api/v1/projects/:id/phases — list phases
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/projects/:id/phases`,
    {
      schema: { description: 'List project phases', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM project_phases WHERE project_id = ${request.params.id} AND tenant_id = ${tenantId} ORDER BY sort_order
      `;
      return reply.status(200).send({ items: rows.map(mapPhase) });
    },
  );

  // PUT /api/v1/projects/:projectId/phases/:id — update phase
  fastify.put<{ Params: { projectId: string; id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/projects/:projectId/phases/:id`,
    {
      schema: { description: 'Update project phase', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE project_phases SET
          name              = COALESCE(${(b['name'] as string | undefined) ?? null}, name),
          budget_satang     = COALESCE(${b['budgetSatang'] != null ? Number(b['budgetSatang']) : null}, budget_satang),
          start_date        = COALESCE(${(b['startDate'] as string | undefined) ?? null}, start_date),
          end_date          = COALESCE(${(b['endDate'] as string | undefined) ?? null}, end_date),
          completion_percent = COALESCE(${b['completionPercent'] != null ? Number(b['completionPercent']) : null}, completion_percent),
          status            = COALESCE(${(b['status'] as string | undefined) ?? null}, status),
          sort_order        = COALESCE(${b['sortOrder'] != null ? Number(b['sortOrder']) : null}, sort_order)
        WHERE id = ${request.params.id} AND project_id = ${request.params.projectId} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Phase not found.' });
      return reply.status(200).send(mapPhase(rows[0]));
    },
  );

  // =========================================================================
  // TIME ENTRIES
  // =========================================================================

  // POST /api/v1/time-entries — create time entry
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/time-entries`,
    {
      schema: { description: 'บันทึกเวลาทำงาน — Create time entry', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_TIME_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const id = crypto.randomUUID();

      if (!b['projectId'] || !b['employeeId'] || !b['entryDate'] || !b['hours'] || !b['rateSatang']) {
        throw new ValidationError({ detail: 'projectId, employeeId, entryDate, hours, rateSatang are required.' });
      }

      const hours = Number(b['hours']);
      const rateSatang = BigInt(b['rateSatang'] as string);
      // amount = hours * rate (rounded)
      const amountSatang = BigInt(Math.round(hours * Number(rateSatang)));

      await fastify.sql`
        INSERT INTO time_entries (id, project_id, phase_id, employee_id, entry_date, hours, rate_satang, amount_satang, description, billable, status, tenant_id)
        VALUES (
          ${id}, ${b['projectId'] as string},
          ${(b['phaseId'] as string | undefined) ?? null},
          ${b['employeeId'] as string},
          ${b['entryDate'] as string},
          ${hours}, ${rateSatang.toString()}::bigint, ${amountSatang.toString()}::bigint,
          ${(b['description'] as string | undefined) ?? null},
          ${b['billable'] !== false},
          'draft', ${tenantId}
        )
      `;

      const rows = await fastify.sql<Record<string, unknown>[]>`SELECT * FROM time_entries WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(mapTimeEntry(rows[0]!));
    },
  );

  // GET /api/v1/time-entries — list time entries
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/time-entries`,
    {
      schema: { description: 'รายการเวลาทำงาน — List time entries', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_TIME_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);
      const projectId = request.query['projectId'];
      const status = request.query['status'];

      let rows: Record<string, unknown>[];
      if (projectId && status) {
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM time_entries WHERE tenant_id = ${tenantId} AND project_id = ${projectId} AND status = ${status}
          ORDER BY entry_date DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (projectId) {
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM time_entries WHERE tenant_id = ${tenantId} AND project_id = ${projectId}
          ORDER BY entry_date DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM time_entries WHERE tenant_id = ${tenantId}
          ORDER BY entry_date DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      return reply.status(200).send({ items: rows.map(mapTimeEntry) });
    },
  );

  // POST /api/v1/time-entries/:id/approve — approve time entry
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/time-entries/:id/approve`,
    {
      schema: { description: 'Approve time entry', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_TIME_APPROVE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE time_entries SET status = 'approved'
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Time entry not found or not in draft status.' });
      return reply.status(200).send(mapTimeEntry(rows[0]));
    },
  );

  // =========================================================================
  // PROJECT EXPENSES
  // =========================================================================

  // POST /api/v1/project-expenses — create expense
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/project-expenses`,
    {
      schema: { description: 'บันทึกค่าใช้จ่ายโครงการ — Create project expense', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_EXPENSE_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId, sub: userId } = request.user;
      const id = crypto.randomUUID();

      if (!b['projectId'] || !b['description'] || !b['amountSatang'] || !b['expenseDate']) {
        throw new ValidationError({ detail: 'projectId, description, amountSatang, expenseDate are required.' });
      }

      await fastify.sql`
        INSERT INTO project_expenses (id, project_id, phase_id, description, amount_satang, expense_date, receipt_number, status, tenant_id, created_by)
        VALUES (
          ${id}, ${b['projectId'] as string},
          ${(b['phaseId'] as string | undefined) ?? null},
          ${b['description'] as string},
          ${Number(b['amountSatang'])}::bigint,
          ${b['expenseDate'] as string},
          ${(b['receiptNumber'] as string | undefined) ?? null},
          'pending', ${tenantId}, ${userId}
        )
      `;

      const rows = await fastify.sql<Record<string, unknown>[]>`SELECT * FROM project_expenses WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(mapExpense(rows[0]!));
    },
  );

  // GET /api/v1/project-expenses — list expenses
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/project-expenses`,
    {
      schema: { description: 'รายการค่าใช้จ่ายโครงการ — List project expenses', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_EXPENSE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);
      const projectId = request.query['projectId'];

      let rows: Record<string, unknown>[];
      if (projectId) {
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM project_expenses WHERE tenant_id = ${tenantId} AND project_id = ${projectId}
          ORDER BY expense_date DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM project_expenses WHERE tenant_id = ${tenantId}
          ORDER BY expense_date DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      return reply.status(200).send({ items: rows.map(mapExpense) });
    },
  );

  // POST /api/v1/project-expenses/:id/approve — approve expense
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/project-expenses/:id/approve`,
    {
      schema: { description: 'Approve project expense', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_EXPENSE_APPROVE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE project_expenses SET status = 'approved'
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'pending'
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Expense not found or not in pending status.' });
      return reply.status(200).send(mapExpense(rows[0]));
    },
  );

  // =========================================================================
  // REPORTS
  // =========================================================================

  // GET /api/v1/projects/:id/profitability — project profitability
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/projects/:id/profitability`,
    {
      schema: { description: 'Project profitability report (revenue - labor - expenses)', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const projectId = request.params.id;

      const proj = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM projects WHERE id = ${projectId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!proj[0]) throw new NotFoundError({ detail: `Project ${projectId} not found.` });

      // Revenue from billed time entries
      const billedTime = await fastify.sql<[{ total: string }]>`
        SELECT COALESCE(SUM(amount_satang), 0)::text as total
        FROM time_entries WHERE project_id = ${projectId} AND tenant_id = ${tenantId} AND status = 'billed'
      `;

      // Labor cost (all approved + billed)
      const laborCost = await fastify.sql<[{ total: string }]>`
        SELECT COALESCE(SUM(amount_satang), 0)::text as total
        FROM time_entries WHERE project_id = ${projectId} AND tenant_id = ${tenantId} AND status IN ('approved','billed')
      `;

      // Expenses (approved + billed)
      const expenseCost = await fastify.sql<[{ total: string }]>`
        SELECT COALESCE(SUM(amount_satang), 0)::text as total
        FROM project_expenses WHERE project_id = ${projectId} AND tenant_id = ${tenantId} AND status IN ('approved','billed')
      `;

      const budget = BigInt(proj[0]['budget_satang'] as number | string);
      const revenue = BigInt(billedTime[0].total);
      const labor = BigInt(laborCost[0].total);
      const expenses = BigInt(expenseCost[0].total);
      const totalCost = labor + expenses;
      const profit = revenue - totalCost;

      return reply.status(200).send({
        projectId,
        budgetSatang: budget.toString(),
        revenueSatang: revenue.toString(),
        laborCostSatang: labor.toString(),
        expenseCostSatang: expenses.toString(),
        totalCostSatang: totalCost.toString(),
        profitSatang: profit.toString(),
        profitMarginPercent: revenue > 0n ? Number((profit * 10000n) / revenue) / 100 : 0,
        budgetUtilizationPercent: budget > 0n ? Number((totalCost * 10000n) / budget) / 100 : 0,
      });
    },
  );

  // GET /api/v1/projects/:id/wip — Work in Progress
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/projects/:id/wip`,
    {
      schema: { description: 'Work in Progress: approved unbilled time + expenses', tags: ['projects'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PS_PROJECT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const projectId = request.params.id;

      const proj = await fastify.sql<Record<string, unknown>[]>`
        SELECT id FROM projects WHERE id = ${projectId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!proj[0]) throw new NotFoundError({ detail: `Project ${projectId} not found.` });

      const unbilledTime = await fastify.sql<[{ total: string; count: string }]>`
        SELECT COALESCE(SUM(amount_satang), 0)::text as total, COUNT(*)::text as count
        FROM time_entries WHERE project_id = ${projectId} AND tenant_id = ${tenantId} AND status = 'approved'
      `;

      const unbilledExpenses = await fastify.sql<[{ total: string; count: string }]>`
        SELECT COALESCE(SUM(amount_satang), 0)::text as total, COUNT(*)::text as count
        FROM project_expenses WHERE project_id = ${projectId} AND tenant_id = ${tenantId} AND status = 'approved'
      `;

      const timeAmount = BigInt(unbilledTime[0].total);
      const expenseAmount = BigInt(unbilledExpenses[0].total);

      return reply.status(200).send({
        projectId,
        unbilledTimeSatang: timeAmount.toString(),
        unbilledTimeEntryCount: parseInt(unbilledTime[0].count, 10),
        unbilledExpenseSatang: expenseAmount.toString(),
        unbilledExpenseCount: parseInt(unbilledExpenses[0].count, 10),
        totalWipSatang: (timeAmount + expenseAmount).toString(),
      });
    },
  );
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapProject(r: Record<string, unknown>) {
  return {
    id: r['id'],
    code: r['code'],
    nameTh: r['name_th'],
    nameEn: r['name_en'],
    customerId: r['customer_id'],
    projectType: r['project_type'],
    status: r['status'],
    budgetSatang: String(r['budget_satang'] ?? '0'),
    startDate: r['start_date'],
    endDate: r['end_date'],
    managerId: r['manager_id'],
    costCenterId: r['cost_center_id'],
    notes: r['notes'],
    createdBy: r['created_by'],
    createdAt: r['created_at'],
    updatedAt: r['updated_at'],
  };
}

function mapPhase(r: Record<string, unknown>) {
  return {
    id: r['id'],
    projectId: r['project_id'],
    name: r['name'],
    budgetSatang: String(r['budget_satang'] ?? '0'),
    startDate: r['start_date'],
    endDate: r['end_date'],
    completionPercent: r['completion_percent'],
    status: r['status'],
    sortOrder: r['sort_order'],
  };
}

function mapTimeEntry(r: Record<string, unknown>) {
  return {
    id: r['id'],
    projectId: r['project_id'],
    phaseId: r['phase_id'],
    employeeId: r['employee_id'],
    entryDate: r['entry_date'],
    hours: r['hours'],
    rateSatang: String(r['rate_satang'] ?? '0'),
    amountSatang: String(r['amount_satang'] ?? '0'),
    description: r['description'],
    billable: r['billable'],
    status: r['status'],
    createdAt: r['created_at'],
  };
}

function mapExpense(r: Record<string, unknown>) {
  return {
    id: r['id'],
    projectId: r['project_id'],
    phaseId: r['phase_id'],
    description: r['description'],
    amountSatang: String(r['amount_satang'] ?? '0'),
    expenseDate: r['expense_date'],
    receiptNumber: r['receipt_number'],
    status: r['status'],
    createdBy: r['created_by'],
    createdAt: r['created_at'],
  };
}
