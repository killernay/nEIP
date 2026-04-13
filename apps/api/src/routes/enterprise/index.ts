/**
 * Enterprise Structure routes:
 *   POST   /api/v1/enterprise/branches           — create branch
 *   GET    /api/v1/enterprise/branches           — list branches (optionally by company)
 *   GET    /api/v1/enterprise/branches/:id       — get branch detail
 *   PUT    /api/v1/enterprise/branches/:id       — update branch
 *   DELETE /api/v1/enterprise/branches/:id       — deactivate branch
 *
 *   POST   /api/v1/enterprise/sales-channels     — create sales channel
 *   GET    /api/v1/enterprise/sales-channels     — list sales channels
 *   GET    /api/v1/enterprise/sales-channels/:id — get sales channel
 *   PUT    /api/v1/enterprise/sales-channels/:id — update sales channel
 *
 *   GET    /api/v1/enterprise/structure           — full org tree
 *   GET    /api/v1/enterprise/summary             — counts per level
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import { COMPANY_CREATE, COMPANY_READ, COMPANY_UPDATE } from '../../lib/permissions.js';

const PREFIX = `${API_V1_PREFIX}/enterprise`;

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

interface BranchRow {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
  company_id: string | null;
  branch_type: string;
  address_th: string | null;
  address_en: string | null;
  phone: string | null;
  manager_id: string | null;
  is_active: boolean;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface SalesChannelRow {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
  channel_type: string;
  is_active: boolean;
  tenant_id: string;
  created_at: Date | string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapBranch(r: BranchRow) {
  return {
    id: r.id,
    code: r.code,
    nameTh: r.name_th,
    nameEn: r.name_en,
    companyId: r.company_id,
    branchType: r.branch_type,
    addressTh: r.address_th,
    addressEn: r.address_en,
    phone: r.phone,
    managerId: r.manager_id,
    isActive: r.is_active,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

function mapSalesChannel(r: SalesChannelRow) {
  return {
    id: r.id,
    code: r.code,
    nameTh: r.name_th,
    nameEn: r.name_en,
    channelType: r.channel_type,
    isActive: r.is_active,
    createdAt: toISO(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function enterpriseRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // =========================================================================
  // BRANCHES
  // =========================================================================

  // POST /enterprise/branches
  fastify.post<{
    Body: {
      code: string;
      nameTh: string;
      nameEn?: string;
      companyId?: string;
      branchType?: string;
      addressTh?: string;
      addressEn?: string;
      phone?: string;
      managerId?: string;
    };
  }>(
    `${PREFIX}/branches`,
    {
      schema: {
        description: 'Create a branch / plant',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code', 'nameTh'],
          properties: {
            code: { type: 'string', minLength: 1 },
            nameTh: { type: 'string', minLength: 1 },
            nameEn: { type: 'string' },
            companyId: { type: 'string' },
            branchType: { type: 'string', enum: ['headquarters', 'office', 'factory', 'warehouse', 'retail_store', 'service_center'] },
            addressTh: { type: 'string' },
            addressEn: { type: 'string' },
            phone: { type: 'string' },
            managerId: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { code, nameTh, nameEn, companyId, branchType = 'office', addressTh, addressEn, phone, managerId } = request.body;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO branches (id, code, name_th, name_en, company_id, branch_type, address_th, address_en, phone, manager_id, tenant_id)
        VALUES (${id}, ${code}, ${nameTh}, ${nameEn ?? null}, ${companyId ?? null}, ${branchType},
                ${addressTh ?? null}, ${addressEn ?? null}, ${phone ?? null}, ${managerId ?? null}, ${tenantId})
      `;

      const rows = await fastify.sql<[BranchRow]>`SELECT * FROM branches WHERE id = ${id}`;
      return reply.status(201).send(mapBranch(rows[0]));
    },
  );

  // GET /enterprise/branches
  fastify.get<{ Querystring: Record<string, string> }>(
    `${PREFIX}/branches`,
    {
      schema: {
        description: 'List branches (optionally filter by companyId)',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            companyId: { type: 'string' },
            limit: { type: 'string' },
            offset: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const companyId = request.query['companyId'];
      const limit = Math.min(Math.max(parseInt(request.query['limit'] ?? '50', 10), 1), 100);
      const offset = Math.max(parseInt(request.query['offset'] ?? '0', 10), 0);

      if (companyId) {
        const countRows = await fastify.sql<[{ count: string }]>`
          SELECT COUNT(*)::text as count FROM branches WHERE tenant_id = ${tenantId} AND company_id = ${companyId}
        `;
        const total = parseInt(countRows[0]?.count ?? '0', 10);
        const rows = await fastify.sql<BranchRow[]>`
          SELECT * FROM branches WHERE tenant_id = ${tenantId} AND company_id = ${companyId}
          ORDER BY code LIMIT ${limit} OFFSET ${offset}
        `;
        return reply.send({ items: rows.map(mapBranch), total, limit, offset, hasMore: offset + limit < total });
      }

      const countRows = await fastify.sql<[{ count: string }]>`
        SELECT COUNT(*)::text as count FROM branches WHERE tenant_id = ${tenantId}
      `;
      const total = parseInt(countRows[0]?.count ?? '0', 10);
      const rows = await fastify.sql<BranchRow[]>`
        SELECT * FROM branches WHERE tenant_id = ${tenantId}
        ORDER BY code LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ items: rows.map(mapBranch), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // GET /enterprise/branches/:id
  fastify.get<{ Params: { id: string } }>(
    `${PREFIX}/branches/:id`,
    {
      schema: {
        description: 'Get branch detail',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<[BranchRow?]>`
        SELECT * FROM branches WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Branch ${request.params.id} not found.` });
      return reply.send(mapBranch(rows[0]));
    },
  );

  // PUT /enterprise/branches/:id
  fastify.put<{
    Params: { id: string };
    Body: { nameTh?: string; nameEn?: string; branchType?: string; addressTh?: string; addressEn?: string; phone?: string; managerId?: string; isActive?: boolean };
  }>(
    `${PREFIX}/branches/:id`,
    {
      schema: {
        description: 'Update branch',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            nameTh: { type: 'string' },
            nameEn: { type: 'string' },
            branchType: { type: 'string', enum: ['headquarters', 'office', 'factory', 'warehouse', 'retail_store', 'service_center'] },
            addressTh: { type: 'string' },
            addressEn: { type: 'string' },
            phone: { type: 'string' },
            managerId: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { nameTh, nameEn, branchType, addressTh, addressEn, phone, managerId, isActive } = request.body;

      const existing = await fastify.sql<[BranchRow?]>`
        SELECT * FROM branches WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Branch ${id} not found.` });

      await fastify.sql`
        UPDATE branches SET
          name_th = COALESCE(${nameTh ?? null}, name_th),
          name_en = COALESCE(${nameEn ?? null}, name_en),
          branch_type = COALESCE(${branchType ?? null}, branch_type),
          address_th = COALESCE(${addressTh ?? null}, address_th),
          address_en = COALESCE(${addressEn ?? null}, address_en),
          phone = COALESCE(${phone ?? null}, phone),
          manager_id = COALESCE(${managerId ?? null}, manager_id),
          is_active = COALESCE(${isActive ?? null}, is_active),
          updated_at = NOW()
        WHERE id = ${id}
      `;

      const rows = await fastify.sql<[BranchRow]>`SELECT * FROM branches WHERE id = ${id}`;
      return reply.send(mapBranch(rows[0]));
    },
  );

  // DELETE /enterprise/branches/:id (soft-delete)
  fastify.delete<{ Params: { id: string } }>(
    `${PREFIX}/branches/:id`,
    {
      schema: {
        description: 'Deactivate a branch',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const existing = await fastify.sql<[BranchRow?]>`
        SELECT * FROM branches WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Branch ${request.params.id} not found.` });

      await fastify.sql`UPDATE branches SET is_active = FALSE, updated_at = NOW() WHERE id = ${request.params.id}`;
      return reply.status(204).send();
    },
  );

  // =========================================================================
  // SALES CHANNELS
  // =========================================================================

  // POST /enterprise/sales-channels
  fastify.post<{
    Body: { code: string; nameTh: string; nameEn?: string; channelType?: string };
  }>(
    `${PREFIX}/sales-channels`,
    {
      schema: {
        description: 'Create a sales channel',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code', 'nameTh'],
          properties: {
            code: { type: 'string', minLength: 1 },
            nameTh: { type: 'string', minLength: 1 },
            nameEn: { type: 'string' },
            channelType: { type: 'string', enum: ['direct', 'retail', 'wholesale', 'online', 'distributor', 'agent'] },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { code, nameTh, nameEn, channelType = 'direct' } = request.body;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO sales_channels (id, code, name_th, name_en, channel_type, tenant_id)
        VALUES (${id}, ${code}, ${nameTh}, ${nameEn ?? null}, ${channelType}, ${tenantId})
      `;

      const rows = await fastify.sql<[SalesChannelRow]>`SELECT * FROM sales_channels WHERE id = ${id}`;
      return reply.status(201).send(mapSalesChannel(rows[0]));
    },
  );

  // GET /enterprise/sales-channels
  fastify.get<{ Querystring: Record<string, string> }>(
    `${PREFIX}/sales-channels`,
    {
      schema: { description: 'List sales channels', tags: ['enterprise'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(COMPANY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<SalesChannelRow[]>`
        SELECT * FROM sales_channels WHERE tenant_id = ${tenantId} ORDER BY code
      `;
      return reply.send({ items: rows.map(mapSalesChannel), total: rows.length });
    },
  );

  // GET /enterprise/sales-channels/:id
  fastify.get<{ Params: { id: string } }>(
    `${PREFIX}/sales-channels/:id`,
    {
      schema: {
        description: 'Get sales channel detail',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<[SalesChannelRow?]>`
        SELECT * FROM sales_channels WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Sales channel ${request.params.id} not found.` });
      return reply.send(mapSalesChannel(rows[0]));
    },
  );

  // PUT /enterprise/sales-channels/:id
  fastify.put<{
    Params: { id: string };
    Body: { nameTh?: string; nameEn?: string; channelType?: string; isActive?: boolean };
  }>(
    `${PREFIX}/sales-channels/:id`,
    {
      schema: {
        description: 'Update sales channel',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            nameTh: { type: 'string' },
            nameEn: { type: 'string' },
            channelType: { type: 'string', enum: ['direct', 'retail', 'wholesale', 'online', 'distributor', 'agent'] },
            isActive: { type: 'boolean' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { nameTh, nameEn, channelType, isActive } = request.body;

      const existing = await fastify.sql<[SalesChannelRow?]>`
        SELECT * FROM sales_channels WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Sales channel ${id} not found.` });

      await fastify.sql`
        UPDATE sales_channels SET
          name_th = COALESCE(${nameTh ?? null}, name_th),
          name_en = COALESCE(${nameEn ?? null}, name_en),
          channel_type = COALESCE(${channelType ?? null}, channel_type),
          is_active = COALESCE(${isActive ?? null}, is_active)
        WHERE id = ${id}
      `;

      const rows = await fastify.sql<[SalesChannelRow]>`SELECT * FROM sales_channels WHERE id = ${id}`;
      return reply.send(mapSalesChannel(rows[0]));
    },
  );

  // =========================================================================
  // ORG TREE & SUMMARY
  // =========================================================================

  // GET /enterprise/structure — full org tree (Company → Branches → Warehouses + Departments + Cost Centers)
  fastify.get(
    `${PREFIX}/structure`,
    {
      schema: {
        description: 'Full org tree: Company → Branches → Warehouses + Departments + Cost Centers',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(COMPANY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      // Fetch all entities in parallel
      const [companies, branchRows, warehouseRows, departmentRows, costCenterRows] = await Promise.all([
        fastify.sql<Array<{ id: string; code: string; name: string; is_branch: boolean; parent_company_id: string | null; is_active: boolean }>>`
          SELECT id, code, name, is_branch, parent_company_id, is_active
          FROM companies WHERE tenant_id = ${tenantId} ORDER BY code
        `,
        fastify.sql<Array<{ id: string; code: string; name_th: string; company_id: string | null; branch_type: string; is_active: boolean }>>`
          SELECT id, code, name_th, company_id, branch_type, is_active
          FROM branches WHERE tenant_id = ${tenantId} ORDER BY code
        `,
        fastify.sql<Array<{ id: string; code: string; name: string }>>`
          SELECT id, code, name FROM warehouses WHERE tenant_id = ${tenantId} ORDER BY code
        `,
        fastify.sql<Array<{ id: string; code: string; name_th: string }>>`
          SELECT id, code, name_th FROM departments WHERE tenant_id = ${tenantId} ORDER BY code
        `,
        fastify.sql<Array<{ id: string; code: string; name_th: string }>>`
          SELECT id, code, name_th FROM cost_centers WHERE tenant_id = ${tenantId} ORDER BY code
        `,
      ]);

      // Build tree: Company → Branches (warehouses/departments/cost_centers listed at tenant level)
      const tree = companies.map((company) => {
        const companyBranches = branchRows
          .filter((b) => b.company_id === company.id)
          .map((branch) => ({
            id: branch.id,
            code: branch.code,
            nameTh: branch.name_th,
            branchType: branch.branch_type,
            isActive: branch.is_active,
          }));

        return {
          id: company.id,
          code: company.code,
          name: company.name,
          isBranch: company.is_branch,
          parentCompanyId: company.parent_company_id,
          isActive: company.is_active,
          branches: companyBranches,
        };
      });

      // Include unassigned branches (no company)
      const unassignedBranches = branchRows
        .filter((b) => !b.company_id)
        .map((branch) => ({
          id: branch.id,
          code: branch.code,
          nameTh: branch.name_th,
          branchType: branch.branch_type,
          isActive: branch.is_active,
        }));

      return reply.send({
        companies: tree,
        unassignedBranches,
        warehouses: warehouseRows.map((w) => ({ id: w.id, code: w.code, name: w.name })),
        departments: departmentRows.map((d) => ({ id: d.id, code: d.code, nameTh: d.name_th })),
        costCenters: costCenterRows.map((cc) => ({ id: cc.id, code: cc.code, nameTh: cc.name_th })),
      });
    },
  );

  // GET /enterprise/summary — counts per level
  fastify.get(
    `${PREFIX}/summary`,
    {
      schema: {
        description: 'Enterprise structure summary — counts per level',
        tags: ['enterprise'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(COMPANY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      const [companyCount, branchCount, warehouseCount, departmentCount, costCenterCount, salesChannelCount] = await Promise.all([
        fastify.sql<[{ count: string }]>`SELECT COUNT(*)::text as count FROM companies WHERE tenant_id = ${tenantId}`,
        fastify.sql<[{ count: string }]>`SELECT COUNT(*)::text as count FROM branches WHERE tenant_id = ${tenantId}`,
        fastify.sql<[{ count: string }]>`SELECT COUNT(*)::text as count FROM warehouses WHERE tenant_id = ${tenantId}`,
        fastify.sql<[{ count: string }]>`SELECT COUNT(*)::text as count FROM departments WHERE tenant_id = ${tenantId}`,
        fastify.sql<[{ count: string }]>`SELECT COUNT(*)::text as count FROM cost_centers WHERE tenant_id = ${tenantId}`,
        fastify.sql<[{ count: string }]>`SELECT COUNT(*)::text as count FROM sales_channels WHERE tenant_id = ${tenantId}`,
      ]);

      return reply.send({
        companies: parseInt(companyCount[0]?.count ?? '0', 10),
        branches: parseInt(branchCount[0]?.count ?? '0', 10),
        warehouses: parseInt(warehouseCount[0]?.count ?? '0', 10),
        departments: parseInt(departmentCount[0]?.count ?? '0', 10),
        costCenters: parseInt(costCenterCount[0]?.count ?? '0', 10),
        salesChannels: parseInt(salesChannelCount[0]?.count ?? '0', 10),
      });
    },
  );
}
