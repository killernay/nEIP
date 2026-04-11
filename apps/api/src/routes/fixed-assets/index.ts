/**
 * Fixed Asset routes (สินทรัพย์ถาวร / FI-AA):
 *   POST /api/v1/fixed-assets              — register asset
 *   GET  /api/v1/fixed-assets              — list (filter by category, status)
 *   GET  /api/v1/fixed-assets/report       — asset register report
 *   GET  /api/v1/fixed-assets/:id          — detail
 *   PUT  /api/v1/fixed-assets/:id          — update
 *   POST /api/v1/fixed-assets/:id/depreciate — run monthly depreciation
 *   POST /api/v1/fixed-assets/:id/dispose  — dispose/sell asset
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  FI_ASSET_CREATE,
  FI_ASSET_READ,
  FI_ASSET_UPDATE,
  FI_ASSET_DEPRECIATE,
  FI_ASSET_DISPOSE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const createAssetBodySchema = {
  type: 'object',
  required: ['assetCode', 'nameTh', 'nameEn', 'category', 'purchaseDate', 'purchaseCostSatang', 'usefulLifeMonths'],
  additionalProperties: false,
  properties: {
    assetCode: { type: 'string', minLength: 1, maxLength: 50 },
    nameTh: { type: 'string', minLength: 1, maxLength: 255 },
    nameEn: { type: 'string', minLength: 1, maxLength: 255 },
    category: { type: 'string', enum: ['land', 'building', 'equipment', 'vehicle', 'furniture', 'it_equipment', 'other'] },
    purchaseDate: { type: 'string', format: 'date' },
    purchaseCostSatang: { type: 'string', description: 'Purchase cost in satang' },
    salvageValueSatang: { type: 'string', default: '0', description: 'Salvage value in satang' },
    usefulLifeMonths: { type: 'integer', minimum: 1 },
    depreciationMethod: { type: 'string', enum: ['straight_line', 'declining_balance'], default: 'straight_line' },
    glAccountId: { type: 'string', nullable: true },
    depreciationAccountId: { type: 'string', nullable: true },
  },
} as const;

const updateAssetBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    nameTh: { type: 'string', minLength: 1, maxLength: 255 },
    nameEn: { type: 'string', minLength: 1, maxLength: 255 },
    glAccountId: { type: 'string', nullable: true },
    depreciationAccountId: { type: 'string', nullable: true },
  },
} as const;

const depreciateBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    periodDate: { type: 'string', format: 'date', description: 'Depreciation period date (YYYY-MM-DD)' },
  },
} as const;

const disposeBodySchema = {
  type: 'object',
  required: ['disposalDate', 'disposalAmountSatang'],
  additionalProperties: false,
  properties: {
    disposalDate: { type: 'string', format: 'date' },
    disposalAmountSatang: { type: 'string', description: 'Proceeds from disposal in satang' },
    reason: { type: 'string', maxLength: 500 },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    category: { type: 'string', enum: ['land', 'building', 'equipment', 'vehicle', 'furniture', 'it_equipment', 'other'] },
    status: { type: 'string', enum: ['active', 'disposed', 'written_off'] },
  },
} as const;

const assetResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    assetCode: { type: 'string' },
    nameTh: { type: 'string' },
    nameEn: { type: 'string' },
    category: { type: 'string' },
    purchaseDate: { type: 'string' },
    purchaseCostSatang: { type: 'string' },
    salvageValueSatang: { type: 'string' },
    usefulLifeMonths: { type: 'integer' },
    depreciationMethod: { type: 'string' },
    accumulatedDepreciationSatang: { type: 'string' },
    netBookValueSatang: { type: 'string' },
    status: { type: 'string' },
    disposalDate: { type: 'string', nullable: true },
    disposalAmountSatang: { type: 'string', nullable: true },
    glAccountId: { type: 'string', nullable: true },
    depreciationAccountId: { type: 'string', nullable: true },
    tenantId: { type: 'string' },
    createdBy: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateAssetBody {
  assetCode: string;
  nameTh: string;
  nameEn: string;
  category: string;
  purchaseDate: string;
  purchaseCostSatang: string;
  salvageValueSatang?: string;
  usefulLifeMonths: number;
  depreciationMethod?: string;
  glAccountId?: string;
  depreciationAccountId?: string;
}

interface UpdateAssetBody {
  nameTh?: string;
  nameEn?: string;
  glAccountId?: string;
  depreciationAccountId?: string;
}

interface DepreciateBody {
  periodDate?: string;
}

interface DisposeBody {
  disposalDate: string;
  disposalAmountSatang: string;
  reason?: string;
}

interface ListQuery {
  limit?: number;
  offset?: number;
  category?: string;
  status?: string;
}

interface IdParams {
  id: string;
}

interface AssetRow {
  id: string;
  asset_code: string;
  name_th: string;
  name_en: string;
  category: string;
  purchase_date: string;
  purchase_cost_satang: bigint;
  salvage_value_satang: bigint;
  useful_life_months: number;
  depreciation_method: string;
  accumulated_depreciation_satang: bigint;
  net_book_value_satang: bigint;
  status: string;
  disposal_date: string | null;
  disposal_amount_satang: bigint | null;
  gl_account_id: string | null;
  depreciation_account_id: string | null;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow { count: string; }

// ---------------------------------------------------------------------------
// Helper: map DB row → API response
// ---------------------------------------------------------------------------

function mapAsset(r: AssetRow) {
  return {
    id: r.id,
    assetCode: r.asset_code,
    nameTh: r.name_th,
    nameEn: r.name_en,
    category: r.category,
    purchaseDate: typeof r.purchase_date === 'string' ? r.purchase_date : (r.purchase_date as unknown as Date).toISOString().slice(0, 10),
    purchaseCostSatang: r.purchase_cost_satang.toString(),
    salvageValueSatang: r.salvage_value_satang.toString(),
    usefulLifeMonths: r.useful_life_months,
    depreciationMethod: r.depreciation_method,
    accumulatedDepreciationSatang: r.accumulated_depreciation_satang.toString(),
    netBookValueSatang: r.net_book_value_satang.toString(),
    status: r.status,
    disposalDate: r.disposal_date,
    disposalAmountSatang: r.disposal_amount_satang?.toString() ?? null,
    glAccountId: r.gl_account_id,
    depreciationAccountId: r.depreciation_account_id,
    tenantId: r.tenant_id,
    createdBy: r.created_by,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function fixedAssetRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/fixed-assets — register asset
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateAssetBody }>(
    `${API_V1_PREFIX}/fixed-assets`,
    {
      schema: {
        description: 'Register a new fixed asset',
        tags: ['fixed-assets'],
        security: [{ bearerAuth: [] }],
        body: createAssetBodySchema,
        response: { 201: { description: 'Asset created', ...assetResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_ASSET_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const {
        assetCode, nameTh, nameEn, category, purchaseDate,
        purchaseCostSatang, salvageValueSatang = '0',
        usefulLifeMonths, depreciationMethod = 'straight_line',
        glAccountId = null, depreciationAccountId = null,
      } = request.body;

      // Check unique asset code within tenant
      const existing = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM fixed_assets WHERE tenant_id = ${tenantId} AND asset_code = ${assetCode} LIMIT 1
      `;
      if (existing[0]) {
        throw new ValidationError({ detail: `Asset code "${assetCode}" already exists.` });
      }

      const id = crypto.randomUUID();
      const cost = BigInt(purchaseCostSatang);
      const salvage = BigInt(salvageValueSatang);

      if (salvage > cost) {
        throw new ValidationError({ detail: 'Salvage value cannot exceed purchase cost.' });
      }

      const nbv = cost - salvage; // initial NBV = cost - salvage

      await fastify.sql`
        INSERT INTO fixed_assets (
          id, asset_code, name_th, name_en, category,
          purchase_date, purchase_cost_satang, salvage_value_satang,
          useful_life_months, depreciation_method,
          accumulated_depreciation_satang, net_book_value_satang,
          status, gl_account_id, depreciation_account_id,
          tenant_id, created_by
        ) VALUES (
          ${id}, ${assetCode}, ${nameTh}, ${nameEn}, ${category},
          ${purchaseDate}, ${cost.toString()}::bigint, ${salvage.toString()}::bigint,
          ${usefulLifeMonths}, ${depreciationMethod},
          0, ${nbv.toString()}::bigint,
          'active', ${glAccountId}, ${depreciationAccountId},
          ${tenantId}, ${userId}
        )
      `;

      const rows = await fastify.sql<[AssetRow]>`
        SELECT * FROM fixed_assets WHERE id = ${id} LIMIT 1
      `;

      return reply.status(201).send(mapAsset(rows[0]));
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/fixed-assets/report — asset register report
  // NOTE: must be registered BEFORE /:id to avoid route conflicts
  // -------------------------------------------------------------------------
  fastify.get(
    `${API_V1_PREFIX}/fixed-assets/report`,
    {
      schema: {
        description: 'Asset register report — totals by category',
        tags: ['fixed-assets'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Asset register summary',
            type: 'object',
            properties: {
              summary: { type: 'array', items: { type: 'object' } },
              totalCostSatang: { type: 'string' },
              totalAccumulatedDepreciationSatang: { type: 'string' },
              totalNetBookValueSatang: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_ASSET_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      interface ReportRow {
        category: string;
        asset_count: string;
        total_cost_satang: bigint;
        total_accumulated_depreciation_satang: bigint;
        total_net_book_value_satang: bigint;
      }

      const rows = await fastify.sql<ReportRow[]>`
        SELECT
          category,
          COUNT(*)::text as asset_count,
          SUM(purchase_cost_satang) as total_cost_satang,
          SUM(accumulated_depreciation_satang) as total_accumulated_depreciation_satang,
          SUM(net_book_value_satang) as total_net_book_value_satang
        FROM fixed_assets
        WHERE tenant_id = ${tenantId} AND status != 'written_off'
        GROUP BY category
        ORDER BY category
      `;

      let totalCost = 0n;
      let totalAccum = 0n;
      let totalNbv = 0n;

      const summary = rows.map((r) => {
        totalCost += r.total_cost_satang;
        totalAccum += r.total_accumulated_depreciation_satang;
        totalNbv += r.total_net_book_value_satang;
        return {
          category: r.category,
          assetCount: r.asset_count,
          totalCostSatang: r.total_cost_satang.toString(),
          totalAccumulatedDepreciationSatang: r.total_accumulated_depreciation_satang.toString(),
          totalNetBookValueSatang: r.total_net_book_value_satang.toString(),
        };
      });

      return reply.status(200).send({
        summary,
        totalCostSatang: totalCost.toString(),
        totalAccumulatedDepreciationSatang: totalAccum.toString(),
        totalNetBookValueSatang: totalNbv.toString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/fixed-assets — list assets
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: ListQuery }>(
    `${API_V1_PREFIX}/fixed-assets`,
    {
      schema: {
        description: 'List fixed assets with optional filters',
        tags: ['fixed-assets'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            description: 'Paginated list of fixed assets',
            type: 'object',
            properties: {
              items: { type: 'array', items: assetResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_ASSET_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { category, status } = request.query;

      let assets: AssetRow[];
      let countRows: CountRow[];

      if (category !== undefined && status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM fixed_assets WHERE tenant_id = ${tenantId} AND category = ${category} AND status = ${status}`;
        assets = await fastify.sql<AssetRow[]>`SELECT * FROM fixed_assets WHERE tenant_id = ${tenantId} AND category = ${category} AND status = ${status} ORDER BY asset_code LIMIT ${limit} OFFSET ${offset}`;
      } else if (category !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM fixed_assets WHERE tenant_id = ${tenantId} AND category = ${category}`;
        assets = await fastify.sql<AssetRow[]>`SELECT * FROM fixed_assets WHERE tenant_id = ${tenantId} AND category = ${category} ORDER BY asset_code LIMIT ${limit} OFFSET ${offset}`;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM fixed_assets WHERE tenant_id = ${tenantId} AND status = ${status}`;
        assets = await fastify.sql<AssetRow[]>`SELECT * FROM fixed_assets WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY asset_code LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM fixed_assets WHERE tenant_id = ${tenantId}`;
        assets = await fastify.sql<AssetRow[]>`SELECT * FROM fixed_assets WHERE tenant_id = ${tenantId} ORDER BY asset_code LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({
        items: assets.map(mapAsset),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/fixed-assets/:id — detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/fixed-assets/:id`,
    {
      schema: {
        description: 'Get fixed asset details',
        tags: ['fixed-assets'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { description: 'Asset detail', ...assetResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_ASSET_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[AssetRow?]>`
        SELECT * FROM fixed_assets WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Fixed asset ${id} not found.` });

      return reply.status(200).send(mapAsset(rows[0]));
    },
  );

  // -------------------------------------------------------------------------
  // PUT /api/v1/fixed-assets/:id — update
  // -------------------------------------------------------------------------
  fastify.put<{ Params: IdParams; Body: UpdateAssetBody }>(
    `${API_V1_PREFIX}/fixed-assets/:id`,
    {
      schema: {
        description: 'Update fixed asset metadata',
        tags: ['fixed-assets'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: updateAssetBodySchema,
        response: { 200: { description: 'Updated asset', ...assetResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(FI_ASSET_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { nameTh, nameEn, glAccountId, depreciationAccountId } = request.body;

      const check = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM fixed_assets WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!check[0]) throw new NotFoundError({ detail: `Fixed asset ${id} not found.` });

      const rows = await fastify.sql<[AssetRow]>`
        UPDATE fixed_assets SET
          name_th = COALESCE(${nameTh ?? null}, name_th),
          name_en = COALESCE(${nameEn ?? null}, name_en),
          gl_account_id = COALESCE(${glAccountId ?? null}, gl_account_id),
          depreciation_account_id = COALESCE(${depreciationAccountId ?? null}, depreciation_account_id),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;

      return reply.status(200).send(mapAsset(rows[0]));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/fixed-assets/:id/depreciate — run monthly depreciation
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams; Body: DepreciateBody }>(
    `${API_V1_PREFIX}/fixed-assets/:id/depreciate`,
    {
      schema: {
        description: 'Run monthly depreciation for an asset (creates JE)',
        tags: ['fixed-assets'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: depreciateBodySchema,
        response: {
          200: {
            description: 'Depreciation result',
            type: 'object',
            properties: {
              asset: assetResponseSchema,
              journalEntryId: { type: 'string' },
              depreciationSatang: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_ASSET_DEPRECIATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;
      const periodDate = request.body.periodDate ?? new Date().toISOString().slice(0, 10);

      const rows = await fastify.sql<[AssetRow?]>`
        SELECT * FROM fixed_assets WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const asset = rows[0];
      if (!asset) throw new NotFoundError({ detail: `Fixed asset ${id} not found.` });
      if (asset.status !== 'active') {
        throw new ValidationError({ detail: `Asset ${id} is not active — cannot depreciate.` });
      }

      // Calculate monthly depreciation
      // postgres.js returns bigint columns as strings by default — convert explicitly.
      const cost = BigInt(asset.purchase_cost_satang);
      const salvage = BigInt(asset.salvage_value_satang);
      const accum = BigInt(asset.accumulated_depreciation_satang);
      const months = BigInt(asset.useful_life_months);

      let depreciationAmount: bigint;
      if (asset.depreciation_method === 'straight_line') {
        depreciationAmount = (cost - salvage) / months;
      } else {
        // Declining balance: 2 / useful_life * NBV
        const rate2x = 2n;
        depreciationAmount = (BigInt(asset.net_book_value_satang) * rate2x) / months;
      }

      // Cap at remaining depreciable amount
      const remainingDepreciable = cost - salvage - accum;
      if (remainingDepreciable <= 0n) {
        throw new ValidationError({ detail: 'Asset is fully depreciated.' });
      }
      if (depreciationAmount > remainingDepreciable) {
        depreciationAmount = remainingDepreciable;
      }

      const newAccum = accum + depreciationAmount;
      const newNbv = cost - newAccum;

      // Create Journal Entry (debit depreciation expense, credit accumulated depreciation)
      const jeId = crypto.randomUUID();
      const jeNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', new Date().getFullYear());
      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;

      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at)
        VALUES (${jeId}, ${jeNumber}, ${'Monthly depreciation: ' + asset.asset_code + ' (' + periodDate + ')'}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, NOW())
      `;

      // Resolve depreciation expense account (Dr) — use asset's depreciation_account_id or find by code
      let deprExpenseAccountId = asset.depreciation_account_id;
      if (!deprExpenseAccountId) {
        // Look for depreciation expense account: code 5500 (standard), or any expense with 'deprec' in name
        const deprAcct = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM chart_of_accounts
          WHERE tenant_id = ${tenantId}
            AND account_type = 'expense'
            AND (code = '5500' OR code LIKE '5500%' OR name_en ILIKE '%depreciat%')
            AND is_active = true
          ORDER BY code ASC LIMIT 1
        `;
        deprExpenseAccountId = deprAcct[0]?.id ?? null;
      }

      // Resolve accumulated depreciation account (Cr) — look for contra-asset by code 1500 prefix or name
      let accumDeprAccountId: string | null = null;
      const accumAcct = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId}
          AND (code = '1500' OR code LIKE '1500%' OR name_en ILIKE '%accum%depreciat%' OR name_en ILIKE '%Property, Plant%')
          AND is_active = true
        ORDER BY code ASC LIMIT 1
      `;
      accumDeprAccountId = accumAcct[0]?.id ?? asset.gl_account_id ?? deprExpenseAccountId;

      // Always create JE lines (COMP-042 fix)
      if (deprExpenseAccountId) {
        // Debit: depreciation expense account
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
          VALUES (
            ${crypto.randomUUID()}, ${jeId}, 1,
            ${deprExpenseAccountId},
            ${'Depreciation expense — ' + asset.asset_code},
            ${depreciationAmount.toString()}::bigint, 0
          )
        `;
        // Credit: accumulated depreciation account
        const creditAccountId = accumDeprAccountId ?? deprExpenseAccountId;
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
          VALUES (
            ${crypto.randomUUID()}, ${jeId}, 2,
            ${creditAccountId},
            ${'Accumulated depreciation — ' + asset.asset_code},
            0, ${depreciationAmount.toString()}::bigint
          )
        `;
      }

      // Update asset
      const updatedRows = await fastify.sql<[AssetRow]>`
        UPDATE fixed_assets SET
          accumulated_depreciation_satang = ${newAccum.toString()}::bigint,
          net_book_value_satang = ${newNbv.toString()}::bigint,
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return reply.status(200).send({
        asset: mapAsset(updatedRows[0]),
        journalEntryId: jeId,
        depreciationSatang: depreciationAmount.toString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/fixed-assets/:id/dispose — dispose asset
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams; Body: DisposeBody }>(
    `${API_V1_PREFIX}/fixed-assets/:id/dispose`,
    {
      schema: {
        description: 'Dispose or sell a fixed asset (creates gain/loss JE)',
        tags: ['fixed-assets'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: disposeBodySchema,
        response: {
          200: {
            description: 'Disposal result',
            type: 'object',
            properties: {
              asset: assetResponseSchema,
              journalEntryId: { type: 'string' },
              gainLossSatang: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_ASSET_DISPOSE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;
      const { disposalDate, disposalAmountSatang } = request.body;

      const rows = await fastify.sql<[AssetRow?]>`
        SELECT * FROM fixed_assets WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const asset = rows[0];
      if (!asset) throw new NotFoundError({ detail: `Fixed asset ${id} not found.` });
      if (asset.status !== 'active') {
        throw new ConflictError({ detail: `Asset ${id} is not active — cannot dispose.` });
      }

      const proceeds = BigInt(disposalAmountSatang);
      const nbv = BigInt(asset.net_book_value_satang);
      const gainLoss = proceeds - nbv; // positive = gain, negative = loss

      // Create disposal Journal Entry
      const jeId = crypto.randomUUID();
      const jeNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', new Date().getFullYear());
      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;

      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at)
        VALUES (${jeId}, ${jeNumber}, ${'Disposal of asset: ' + asset.asset_code}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, NOW())
      `;

      if (asset.gl_account_id) {
        // Credit fixed asset cost (remove from books)
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
          VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${asset.gl_account_id}, ${'Remove asset: ' + asset.asset_code}, 0, ${asset.purchase_cost_satang.toString()}::bigint)
        `;
        // Debit accumulated depreciation (clear it)
        if (asset.depreciation_account_id && BigInt(asset.accumulated_depreciation_satang) > 0n) {
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${asset.depreciation_account_id}, ${'Clear accumulated depr: ' + asset.asset_code}, ${BigInt(asset.accumulated_depreciation_satang).toString()}::bigint, 0)
          `;
        }
        // Record gain or loss
        if (gainLoss > 0n) {
          // Debit cash/proceeds, credit gain on disposal
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${jeId}, 3, ${asset.gl_account_id}, ${'Gain on disposal: ' + asset.asset_code}, 0, ${gainLoss.toString()}::bigint)
          `;
        } else if (gainLoss < 0n) {
          const lossAbs = gainLoss * -1n;
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${jeId}, 3, ${asset.gl_account_id}, ${'Loss on disposal: ' + asset.asset_code}, ${lossAbs.toString()}::bigint, 0)
          `;
        }
      }

      // Update asset status
      const updatedRows = await fastify.sql<[AssetRow]>`
        UPDATE fixed_assets SET
          status = 'disposed',
          disposal_date = ${disposalDate},
          disposal_amount_satang = ${proceeds.toString()}::bigint,
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return reply.status(200).send({
        asset: mapAsset(updatedRows[0]),
        journalEntryId: jeId,
        gainLossSatang: gainLoss.toString(),
      });
    },
  );
}
