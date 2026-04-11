/**
 * HR Org Hierarchy + Position Management routes:
 *   GET  /api/v1/departments/tree                   — org tree
 *   POST /api/v1/positions                          — create position
 *   GET  /api/v1/positions                          — list positions
 *   GET  /api/v1/positions/:id                      — detail
 *   PUT  /api/v1/positions/:id                      — update
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';

const HR_DEPT_READ     = 'hr:department:read'   as const;
const HR_POSITION_CREATE = 'hr:position:create' as const;
const HR_POSITION_READ   = 'hr:position:read'   as const;
const HR_POSITION_UPDATE = 'hr:position:update' as const;

interface DepartmentTreeRow {
  id: string; code: string; name_th: string; name_en: string;
  parent_id: string | null; manager_id: string | null;
  cost_center_id: string | null; tenant_id: string;
  created_at: Date | string; updated_at: Date | string;
}

interface PositionRow {
  id: string; code: string; title: string; department_id: string | null;
  reports_to_position_id: string | null; headcount: number;
  is_active: boolean; tenant_id: string;
  created_at: Date | string; updated_at: Date | string;
}

function mapPosition(p: PositionRow) {
  return {
    id: p.id, code: p.code, title: p.title,
    departmentId: p.department_id,
    reportsToPositionId: p.reports_to_position_id,
    headcount: p.headcount, isActive: p.is_active,
    createdAt: toISO(p.created_at), updatedAt: toISO(p.updated_at),
  };
}

function buildTree(departments: DepartmentTreeRow[], parentId: string | null = null): object[] {
  return departments
    .filter((d) => d.parent_id === parentId)
    .map((d) => ({
      id: d.id, code: d.code, nameTh: d.name_th, nameEn: d.name_en,
      managerId: d.manager_id, costCenterId: d.cost_center_id,
      children: buildTree(departments, d.id),
    }));
}

export async function positionRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // GET /departments/tree — org hierarchy
  fastify.get(
    `${API_V1_PREFIX}/departments/tree`,
    {
      schema: { description: 'ดูโครงสร้างองค์กร — Get org hierarchy tree', tags: ['hr'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_DEPT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<DepartmentTreeRow[]>`
        SELECT * FROM departments WHERE tenant_id = ${tenantId} ORDER BY name_en
      `;
      const tree = buildTree(rows);
      return reply.status(200).send({ tree });
    },
  );

  // POST /positions — create
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/positions`,
    {
      schema: { description: 'สร้างตำแหน่งงาน — Create a position', tags: ['hr'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_POSITION_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO positions (id, code, title, department_id, reports_to_position_id, headcount, is_active, tenant_id)
        VALUES (${id}, ${(b['code'] as string) ?? ''}, ${(b['title'] as string) ?? ''},
                ${(b['departmentId'] as string | undefined) ?? null},
                ${(b['reportsToPositionId'] as string | undefined) ?? null},
                ${Number(b['headcount'] ?? 1)}, true, ${tenantId})
      `;

      const rows = await fastify.sql<[PositionRow]>`SELECT * FROM positions WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(mapPosition(rows[0]));
    },
  );

  // GET /positions — list
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/positions`,
    {
      schema: { description: 'รายการตำแหน่งงาน — List positions', tags: ['hr'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_POSITION_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const departmentId = request.query['departmentId'];

      let rows: PositionRow[];
      if (departmentId) {
        rows = await fastify.sql<PositionRow[]>`SELECT * FROM positions WHERE tenant_id = ${tenantId} AND department_id = ${departmentId} ORDER BY code`;
      } else {
        rows = await fastify.sql<PositionRow[]>`SELECT * FROM positions WHERE tenant_id = ${tenantId} ORDER BY code`;
      }

      return reply.status(200).send({ items: rows.map(mapPosition), total: rows.length });
    },
  );

  // GET /positions/:id — detail
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/positions/:id`,
    {
      schema: { description: 'ดูรายละเอียดตำแหน่ง — Get position detail', tags: ['hr'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_POSITION_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<[PositionRow?]>`SELECT * FROM positions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `Position ${id} not found.` });

      // Get employees holding this position
      const employees = await fastify.sql<{ id: string; employee_code: string; first_name_th: string; last_name_th: string }[]>`
        SELECT id, employee_code, first_name_th, last_name_th FROM employees WHERE position_id = ${id} AND tenant_id = ${tenantId}
      `;

      return reply.status(200).send({
        ...mapPosition(rows[0]),
        employees: employees.map((e) => ({ id: e.id, employeeCode: e.employee_code, nameTh: `${e.first_name_th} ${e.last_name_th}` })),
        filledCount: employees.length,
      });
    },
  );

  // PUT /positions/:id — update
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/positions/:id`,
    {
      schema: { description: 'อัปเดตตำแหน่ง — Update a position', tags: ['hr'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(HR_POSITION_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[PositionRow?]>`SELECT * FROM positions WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `Position ${id} not found.` });

      const rows = await fastify.sql<[PositionRow]>`
        UPDATE positions SET
          title = COALESCE(${(b['title'] as string | undefined) ?? null}, title),
          department_id = COALESCE(${(b['departmentId'] as string | undefined) ?? null}, department_id),
          reports_to_position_id = COALESCE(${(b['reportsToPositionId'] as string | undefined) ?? null}, reports_to_position_id),
          headcount = COALESCE(${b['headcount'] != null ? Number(b['headcount']) : null}, headcount),
          is_active = COALESCE(${b['isActive'] != null ? Boolean(b['isActive']) : null}, is_active),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return reply.status(200).send(mapPosition(rows[0]));
    },
  );
}
