/**
 * Deferred Tax Calculation routes:
 *   POST /api/v1/tax/deferred-tax                — create deferred tax item
 *   GET  /api/v1/tax/deferred-tax                — list items
 *   GET  /api/v1/tax/deferred-tax/:id            — get detail
 *   PUT  /api/v1/tax/deferred-tax/:id            — update item
 *   POST /api/v1/tax/deferred-tax/calculate      — recalculate all items
 *   POST /api/v1/tax/deferred-tax/post-je        — post deferred tax JE
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  TAX_DEFERRED_CREATE,
  TAX_DEFERRED_READ,
  TAX_DEFERRED_UPDATE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DtRow {
  id: string; description: string;
  tax_base_satang: bigint; accounting_base_satang: bigint;
  temporary_difference_satang: bigint;
  deferred_tax_asset_satang: bigint; deferred_tax_liability_satang: bigint;
  tax_rate_bp: number; tenant_id: string; created_by: string;
  created_at: Date | string; updated_at: Date | string;
}

interface IdParams { id: string; }
interface ListQuery { limit?: number; offset?: number; }
interface CountRow { count: string; }

function mapDt(r: DtRow) {
  return {
    id: r.id, description: r.description,
    taxBaseSatang: r.tax_base_satang.toString(),
    accountingBaseSatang: r.accounting_base_satang.toString(),
    temporaryDifferenceSatang: r.temporary_difference_satang.toString(),
    deferredTaxAssetSatang: r.deferred_tax_asset_satang.toString(),
    deferredTaxLiabilitySatang: r.deferred_tax_liability_satang.toString(),
    taxRateBp: r.tax_rate_bp,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

/**
 * Calculate deferred tax from bases and rate.
 * Positive difference (accounting > tax) = DTA; negative = DTL
 */
function calcDeferred(taxBase: bigint, accountingBase: bigint, taxRateBp: number) {
  const diff = accountingBase - taxBase;
  const absDiff = diff < 0n ? -diff : diff;
  const taxEffect = (absDiff * BigInt(taxRateBp)) / 10000n;
  return {
    temporaryDifference: diff,
    dta: diff > 0n ? taxEffect : 0n,
    dtl: diff < 0n ? taxEffect : 0n,
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function deferredTaxRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // POST /api/v1/tax/deferred-tax
  fastify.post<{ Body: { description: string; taxBaseSatang: string; accountingBaseSatang: string; taxRateBp?: number } }>(
    `${API_V1_PREFIX}/tax/deferred-tax`,
    {
      schema: {
        description: 'Create a deferred tax item with auto-calculation',
        tags: ['tax'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['description', 'taxBaseSatang', 'accountingBaseSatang'],
          additionalProperties: false,
          properties: {
            description: { type: 'string', minLength: 1 },
            taxBaseSatang: { type: 'string' },
            accountingBaseSatang: { type: 'string' },
            taxRateBp: { type: 'integer', minimum: 1, maximum: 10000, default: 2000 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(TAX_DEFERRED_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { description, taxBaseSatang, accountingBaseSatang, taxRateBp = 2000 } = request.body;

      const taxBase = BigInt(taxBaseSatang);
      const accBase = BigInt(accountingBaseSatang);
      const { temporaryDifference, dta, dtl } = calcDeferred(taxBase, accBase, taxRateBp);

      const id = crypto.randomUUID();
      const rows = await fastify.sql<[DtRow]>`
        INSERT INTO deferred_tax_items (id, description, tax_base_satang, accounting_base_satang, temporary_difference_satang, deferred_tax_asset_satang, deferred_tax_liability_satang, tax_rate_bp, tenant_id, created_by)
        VALUES (${id}, ${description}, ${taxBase.toString()}::bigint, ${accBase.toString()}::bigint, ${temporaryDifference.toString()}::bigint, ${dta.toString()}::bigint, ${dtl.toString()}::bigint, ${taxRateBp}, ${tenantId}, ${userId})
        RETURNING *
      `;

      return reply.status(201).send(mapDt(rows[0]));
    },
  );

  // GET /api/v1/tax/deferred-tax
  fastify.get<{ Querystring: ListQuery }>(
    `${API_V1_PREFIX}/tax/deferred-tax`,
    {
      schema: {
        description: 'List deferred tax items',
        tags: ['tax'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(TAX_DEFERRED_READ)],
    },
    async (request, _reply) => {
      const { tenantId } = request.user;
      const { limit = 20, offset = 0 } = request.query;

      const [items, countRows] = await Promise.all([
        fastify.sql<DtRow[]>`SELECT * FROM deferred_tax_items WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM deferred_tax_items WHERE tenant_id = ${tenantId}`,
      ]);

      const total = parseInt(countRows[0]?.count ?? '0', 10);

      // Compute summary
      let totalDta = 0n;
      let totalDtl = 0n;
      for (const item of items) {
        totalDta += item.deferred_tax_asset_satang;
        totalDtl += item.deferred_tax_liability_satang;
      }

      return {
        items: items.map(mapDt),
        total, limit, offset, hasMore: offset + limit < total,
        summary: {
          totalDeferredTaxAssetSatang: totalDta.toString(),
          totalDeferredTaxLiabilitySatang: totalDtl.toString(),
          netDeferredTaxSatang: (totalDta - totalDtl).toString(),
        },
      };
    },
  );

  // GET /api/v1/tax/deferred-tax/:id
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/tax/deferred-tax/:id`,
    {
      schema: {
        description: 'Get deferred tax item detail',
        tags: ['tax'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(TAX_DEFERRED_READ)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<[DtRow?]>`SELECT * FROM deferred_tax_items WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!rows[0]) throw new NotFoundError({ detail: `Deferred tax item ${id} not found.` });
      return mapDt(rows[0]);
    },
  );

  // PUT /api/v1/tax/deferred-tax/:id
  fastify.put<{ Params: IdParams; Body: { taxBaseSatang?: string; accountingBaseSatang?: string; taxRateBp?: number; description?: string } }>(
    `${API_V1_PREFIX}/tax/deferred-tax/:id`,
    {
      schema: {
        description: 'Update a deferred tax item (recalculates automatically)',
        tags: ['tax'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            description: { type: 'string', minLength: 1 },
            taxBaseSatang: { type: 'string' },
            accountingBaseSatang: { type: 'string' },
            taxRateBp: { type: 'integer', minimum: 1, maximum: 10000 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(TAX_DEFERRED_UPDATE)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const existing = await fastify.sql<[DtRow?]>`SELECT * FROM deferred_tax_items WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`;
      if (!existing[0]) throw new NotFoundError({ detail: `Deferred tax item ${id} not found.` });

      const taxBase = request.body.taxBaseSatang ? BigInt(request.body.taxBaseSatang) : BigInt(existing[0].tax_base_satang);
      const accBase = request.body.accountingBaseSatang ? BigInt(request.body.accountingBaseSatang) : BigInt(existing[0].accounting_base_satang);
      const taxRateBp = request.body.taxRateBp ?? existing[0].tax_rate_bp;
      const description = request.body.description ?? existing[0].description;

      const { temporaryDifference, dta, dtl } = calcDeferred(taxBase, accBase, taxRateBp);

      const rows = await fastify.sql<[DtRow]>`
        UPDATE deferred_tax_items SET
          description = ${description},
          tax_base_satang = ${taxBase.toString()}::bigint,
          accounting_base_satang = ${accBase.toString()}::bigint,
          temporary_difference_satang = ${temporaryDifference.toString()}::bigint,
          deferred_tax_asset_satang = ${dta.toString()}::bigint,
          deferred_tax_liability_satang = ${dtl.toString()}::bigint,
          tax_rate_bp = ${taxRateBp},
          updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;

      return mapDt(rows[0]);
    },
  );

  // POST /api/v1/tax/deferred-tax/calculate — recalculate all items
  fastify.post(
    `${API_V1_PREFIX}/tax/deferred-tax/calculate`,
    {
      schema: {
        description: 'Recalculate all deferred tax items for current tenant',
        tags: ['tax'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(TAX_DEFERRED_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      const items = await fastify.sql<DtRow[]>`SELECT * FROM deferred_tax_items WHERE tenant_id = ${tenantId}`;
      let totalDta = 0n;
      let totalDtl = 0n;

      for (const item of items) {
        const { temporaryDifference, dta, dtl } = calcDeferred(
          BigInt(item.tax_base_satang), BigInt(item.accounting_base_satang), item.tax_rate_bp,
        );
        await fastify.sql`
          UPDATE deferred_tax_items SET
            temporary_difference_satang = ${temporaryDifference.toString()}::bigint,
            deferred_tax_asset_satang = ${dta.toString()}::bigint,
            deferred_tax_liability_satang = ${dtl.toString()}::bigint,
            updated_at = NOW()
          WHERE id = ${item.id}
        `;
        totalDta += dta;
        totalDtl += dtl;
      }

      return reply.status(200).send({
        recalculatedCount: items.length,
        totalDeferredTaxAssetSatang: totalDta.toString(),
        totalDeferredTaxLiabilitySatang: totalDtl.toString(),
        netDeferredTaxSatang: (totalDta - totalDtl).toString(),
      });
    },
  );

  // POST /api/v1/tax/deferred-tax/post-je — post deferred tax journal entry
  fastify.post(
    `${API_V1_PREFIX}/tax/deferred-tax/post-je`,
    {
      schema: {
        description: 'Post a journal entry for net deferred tax position',
        tags: ['tax'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(TAX_DEFERRED_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;

      const items = await fastify.sql<DtRow[]>`SELECT * FROM deferred_tax_items WHERE tenant_id = ${tenantId}`;
      let totalDta = 0n;
      let totalDtl = 0n;
      for (const item of items) {
        totalDta += item.deferred_tax_asset_satang;
        totalDtl += item.deferred_tax_liability_satang;
      }

      if (totalDta === 0n && totalDtl === 0n) {
        return reply.status(200).send({ message: 'No deferred tax to post.', journalEntryId: null });
      }

      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;
      const jeId = crypto.randomUUID();
      const jeDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);

      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
        VALUES (${jeId}, ${jeDocNumber}, 'Deferred tax adjustment', 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      let lineNumber = 1;
      if (totalDta > 0n) {
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
          VALUES (${crypto.randomUUID()}, ${jeId}, ${lineNumber++}, 'deferred_tax_asset', 'Deferred tax asset', ${totalDta.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
        `;
      }
      if (totalDtl > 0n) {
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
          VALUES (${crypto.randomUUID()}, ${jeId}, ${lineNumber++}, 'deferred_tax_liability', 'Deferred tax liability', 0::bigint, ${totalDtl.toString()}::bigint, ${now.toISOString()}::timestamptz)
        `;
      }

      // Balancing entry: Dr/Cr Income Tax Expense
      const net = totalDta - totalDtl;
      if (net > 0n) {
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
          VALUES (${crypto.randomUUID()}, ${jeId}, ${lineNumber++}, 'income_tax_expense', 'Deferred tax benefit', 0::bigint, ${net.toString()}::bigint, ${now.toISOString()}::timestamptz)
        `;
      } else if (net < 0n) {
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
          VALUES (${crypto.randomUUID()}, ${jeId}, ${lineNumber++}, 'income_tax_expense', 'Deferred tax expense', ${(-net).toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
        `;
      }

      return reply.status(201).send({
        journalEntryId: jeId,
        documentNumber: jeDocNumber,
        totalDeferredTaxAssetSatang: totalDta.toString(),
        totalDeferredTaxLiabilitySatang: totalDtl.toString(),
        netDeferredTaxSatang: net.toString(),
      });
    },
  );
}
