/**
 * Revenue Recognition (IFRS 15) routes:
 *   POST /api/v1/revenue/contracts                           — create revenue contract
 *   GET  /api/v1/revenue/contracts                           — list contracts
 *   GET  /api/v1/revenue/contracts/:id                       — get contract detail
 *   POST /api/v1/revenue/contracts/:id/obligations           — add performance obligation
 *   POST /api/v1/revenue/contracts/:id/allocate              — allocate transaction price
 *   POST /api/v1/revenue/contracts/:id/recognize             — recognize revenue
 *   PUT  /api/v1/revenue/obligations/:obligationId/progress  — update progress
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  REV_CONTRACT_CREATE,
  REV_CONTRACT_READ,
  REV_CONTRACT_UPDATE,
  REV_RECOGNIZE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContractRow {
  id: string; contract_number: string; customer_id: string; contract_date: string;
  total_price_satang: bigint; status: string; tenant_id: string; created_by: string;
  created_at: Date | string; updated_at: Date | string;
}

interface ObligationRow {
  id: string; contract_id: string; description: string;
  standalone_price_satang: bigint; allocation_satang: bigint;
  satisfaction_method: string; progress_percent: number; recognized_satang: bigint;
  created_at: Date | string; updated_at: Date | string;
}

interface IdParams { id: string; }
interface ObligationIdParams { obligationId: string; }
interface ListQuery { limit?: number; offset?: number; status?: string; }
interface CountRow { count: string; }

function mapContract(r: ContractRow) {
  return {
    id: r.id, contractNumber: r.contract_number, customerId: r.customer_id,
    contractDate: r.contract_date, totalPriceSatang: r.total_price_satang.toString(),
    status: r.status, createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

function mapObligation(r: ObligationRow) {
  return {
    id: r.id, contractId: r.contract_id, description: r.description,
    standalonePriceSatang: r.standalone_price_satang.toString(),
    allocationSatang: r.allocation_satang.toString(),
    satisfactionMethod: r.satisfaction_method,
    progressPercent: r.progress_percent,
    recognizedSatang: r.recognized_satang.toString(),
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function revenueRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // POST /api/v1/revenue/contracts
  fastify.post<{ Body: { customerId: string; contractDate: string; totalPriceSatang: string } }>(
    `${API_V1_PREFIX}/revenue/contracts`,
    {
      schema: {
        description: 'Create a revenue contract (IFRS 15)',
        tags: ['revenue'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['customerId', 'contractDate', 'totalPriceSatang'],
          additionalProperties: false,
          properties: {
            customerId: { type: 'string' },
            contractDate: { type: 'string', format: 'date' },
            totalPriceSatang: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REV_CONTRACT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { customerId, contractDate, totalPriceSatang } = request.body;

      const id = crypto.randomUUID();
      const contractNumber = await nextDocNumber(fastify.sql, tenantId, 'revenue_contract', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO revenue_contracts (id, contract_number, customer_id, contract_date, total_price_satang, status, tenant_id, created_by)
        VALUES (${id}, ${contractNumber}, ${customerId}, ${contractDate}, ${totalPriceSatang}::bigint, 'draft', ${tenantId}, ${userId})
      `;

      const rows = await fastify.sql<[ContractRow]>`SELECT * FROM revenue_contracts WHERE id = ${id}`;
      return reply.status(201).send(mapContract(rows[0]));
    },
  );

  // GET /api/v1/revenue/contracts
  fastify.get<{ Querystring: ListQuery }>(
    `${API_V1_PREFIX}/revenue/contracts`,
    {
      schema: {
        description: 'List revenue contracts',
        tags: ['revenue'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
            status: { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'] },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REV_CONTRACT_READ)],
    },
    async (request, _reply) => {
      const { tenantId } = request.user;
      const { limit = 20, offset = 0, status } = request.query;

      let items: ContractRow[];
      let countRows: CountRow[];

      if (status) {
        [items, countRows] = await Promise.all([
          fastify.sql<ContractRow[]>`SELECT * FROM revenue_contracts WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM revenue_contracts WHERE tenant_id = ${tenantId} AND status = ${status}`,
        ]);
      } else {
        [items, countRows] = await Promise.all([
          fastify.sql<ContractRow[]>`SELECT * FROM revenue_contracts WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
          fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM revenue_contracts WHERE tenant_id = ${tenantId}`,
        ]);
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return { items: items.map(mapContract), total, limit, offset, hasMore: offset + limit < total };
    },
  );

  // GET /api/v1/revenue/contracts/:id
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/revenue/contracts/:id`,
    {
      schema: {
        description: 'Get revenue contract detail with performance obligations',
        tags: ['revenue'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(REV_CONTRACT_READ)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[ContractRow?]>`SELECT * FROM revenue_contracts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `Revenue contract ${id} not found.` });

      const obligations = await fastify.sql<ObligationRow[]>`
        SELECT * FROM performance_obligations WHERE contract_id = ${id} ORDER BY created_at ASC
      `;

      return { ...mapContract(rows[0]), obligations: obligations.map(mapObligation) };
    },
  );

  // POST /api/v1/revenue/contracts/:id/obligations
  fastify.post<{ Params: IdParams; Body: { description: string; standalonePriceSatang: string; satisfactionMethod: string } }>(
    `${API_V1_PREFIX}/revenue/contracts/:id/obligations`,
    {
      schema: {
        description: 'Add a performance obligation to a revenue contract',
        tags: ['revenue'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['description', 'standalonePriceSatang', 'satisfactionMethod'],
          additionalProperties: false,
          properties: {
            description: { type: 'string', minLength: 1 },
            standalonePriceSatang: { type: 'string' },
            satisfactionMethod: { type: 'string', enum: ['point_in_time', 'over_time'] },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REV_CONTRACT_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { description, standalonePriceSatang, satisfactionMethod } = request.body;

      const contract = await fastify.sql<[ContractRow?]>`SELECT * FROM revenue_contracts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!contract[0]) throw new NotFoundError({ detail: `Revenue contract ${id} not found.` });

      const obligationId = crypto.randomUUID();
      const rows = await fastify.sql<[ObligationRow]>`
        INSERT INTO performance_obligations (id, contract_id, description, standalone_price_satang, satisfaction_method)
        VALUES (${obligationId}, ${id}, ${description}, ${standalonePriceSatang}::bigint, ${satisfactionMethod})
        RETURNING *
      `;

      return reply.status(201).send(mapObligation(rows[0]));
    },
  );

  // POST /api/v1/revenue/contracts/:id/allocate — allocate transaction price
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/revenue/contracts/:id/allocate`,
    {
      schema: {
        description: 'Allocate transaction price to performance obligations based on standalone selling prices',
        tags: ['revenue'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(REV_CONTRACT_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const contract = await fastify.sql<[ContractRow?]>`SELECT * FROM revenue_contracts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!contract[0]) throw new NotFoundError({ detail: `Revenue contract ${id} not found.` });

      const obligations = await fastify.sql<ObligationRow[]>`
        SELECT * FROM performance_obligations WHERE contract_id = ${id}
      `;
      if (obligations.length === 0) {
        throw new ValidationError({ detail: 'No performance obligations to allocate.' });
      }

      const totalStandalone = obligations.reduce((sum, o) => sum + BigInt(o.standalone_price_satang), 0n);
      if (totalStandalone === 0n) {
        throw new ValidationError({ detail: 'Total standalone price cannot be zero.' });
      }

      const totalPrice = BigInt(contract[0].total_price_satang);
      const allocations: Array<{ id: string; allocationSatang: string }> = [];

      let allocated = 0n;
      for (let i = 0; i < obligations.length; i++) {
        const o = obligations[i]!;
        let allocation: bigint;
        if (i === obligations.length - 1) {
          allocation = totalPrice - allocated; // last one gets remainder
        } else {
          allocation = (totalPrice * BigInt(o.standalone_price_satang)) / totalStandalone;
        }
        allocated += allocation;

        await fastify.sql`
          UPDATE performance_obligations SET allocation_satang = ${allocation.toString()}::bigint, updated_at = NOW()
          WHERE id = ${o.id}
        `;
        allocations.push({ id: o.id, allocationSatang: allocation.toString() });
      }

      // Activate contract
      await fastify.sql`UPDATE revenue_contracts SET status = 'active', updated_at = NOW() WHERE id = ${id}`;

      return reply.status(200).send({ contractId: id, allocations });
    },
  );

  // POST /api/v1/revenue/contracts/:id/recognize — recognize revenue and post JE
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/revenue/contracts/:id/recognize`,
    {
      schema: {
        description: 'Recognize revenue for all obligations based on progress and post journal entries',
        tags: ['revenue'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(REV_RECOGNIZE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const contract = await fastify.sql<[ContractRow?]>`SELECT * FROM revenue_contracts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!contract[0]) throw new NotFoundError({ detail: `Revenue contract ${id} not found.` });
      if (contract[0].status !== 'active') {
        throw new ValidationError({ detail: 'Contract must be active to recognize revenue.' });
      }

      const obligations = await fastify.sql<ObligationRow[]>`
        SELECT * FROM performance_obligations WHERE contract_id = ${id}
      `;

      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;
      let totalRecognized = 0n;
      const details: Array<{ obligationId: string; recognizedSatang: string }> = [];

      for (const o of obligations) {
        const allocation = BigInt(o.allocation_satang);
        let targetRecognized: bigint;

        if (o.satisfaction_method === 'point_in_time') {
          targetRecognized = o.progress_percent >= 100 ? allocation : 0n;
        } else {
          targetRecognized = (allocation * BigInt(o.progress_percent)) / 100n;
        }

        const alreadyRecognized = BigInt(o.recognized_satang);
        const incremental = targetRecognized - alreadyRecognized;
        if (incremental <= 0n) continue;

        await fastify.sql`
          UPDATE performance_obligations SET recognized_satang = ${targetRecognized.toString()}::bigint, updated_at = NOW()
          WHERE id = ${o.id}
        `;

        totalRecognized += incremental;
        details.push({ obligationId: o.id, recognizedSatang: incremental.toString() });
      }

      if (totalRecognized === 0n) {
        return reply.status(200).send({ message: 'No additional revenue to recognize.', journalEntryId: null });
      }

      // Post JE: Dr Contract Asset/Receivable, Cr Revenue
      const jeId = crypto.randomUUID();
      const jeDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);

      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
        VALUES (${jeId}, ${jeDocNumber}, ${'IFRS 15 revenue recognition — Contract ' + contract[0].contract_number}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 1, 'contract_asset', ${'Contract asset — ' + contract[0].contract_number}, ${totalRecognized.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
      `;
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 2, 'revenue', ${'Revenue — ' + contract[0].contract_number}, 0::bigint, ${totalRecognized.toString()}::bigint, ${now.toISOString()}::timestamptz)
      `;

      return reply.status(200).send({
        journalEntryId: jeId,
        documentNumber: jeDocNumber,
        totalRecognizedSatang: totalRecognized.toString(),
        details,
      });
    },
  );

  // PUT /api/v1/revenue/obligations/:obligationId/progress
  fastify.put<{ Params: ObligationIdParams; Body: { progressPercent: number } }>(
    `${API_V1_PREFIX}/revenue/obligations/:obligationId/progress`,
    {
      schema: {
        description: 'Update progress on a performance obligation (over_time method)',
        tags: ['revenue'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['obligationId'], properties: { obligationId: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['progressPercent'],
          additionalProperties: false,
          properties: { progressPercent: { type: 'integer', minimum: 0, maximum: 100 } },
        },
      },
      preHandler: [requireAuth, requirePermission(REV_CONTRACT_UPDATE)],
    },
    async (request, _reply) => {
      const { obligationId } = request.params;
      const { progressPercent } = request.body;

      const rows = await fastify.sql<[ObligationRow?]>`SELECT * FROM performance_obligations WHERE id = ${obligationId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `Obligation ${obligationId} not found.` });

      const updated = await fastify.sql<[ObligationRow]>`
        UPDATE performance_obligations SET progress_percent = ${progressPercent}, updated_at = NOW()
        WHERE id = ${obligationId} RETURNING *
      `;

      return mapObligation(updated[0]);
    },
  );
}
