/**
 * Currency & Exchange Rate routes (Phase 5.1 — Multi-Currency):
 *   POST /api/v1/currencies              — create currency
 *   GET  /api/v1/currencies              — list currencies
 *   PUT  /api/v1/currencies/:id          — update currency
 *   POST /api/v1/exchange-rates          — add exchange rate
 *   GET  /api/v1/exchange-rates          — list exchange rates
 *   GET  /api/v1/exchange-rates/convert  — get rate for conversion
 *   POST /api/v1/gl/fx-revaluation       — revalue open items at month-end
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  FI_CURRENCY_CREATE,
  FI_CURRENCY_READ,
  FI_CURRENCY_UPDATE,
  GL_JOURNAL_CREATE,
} from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CurrencyRow {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ExchangeRateRow {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: string;
  effective_date: string;
  source: string;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapCurrency(r: CurrencyRow) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    symbol: r.symbol,
    decimalPlaces: r.decimal_places,
    isActive: r.is_active,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

function mapRate(r: ExchangeRateRow) {
  return {
    id: r.id,
    fromCurrency: r.from_currency,
    toCurrency: r.to_currency,
    rate: r.rate,
    effectiveDate: r.effective_date,
    source: r.source,
    createdAt: toISO(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function currencyRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /currencies
  fastify.post<{ Body: { code: string; name: string; symbol?: string; decimalPlaces?: number } }>(
    `${API_V1_PREFIX}/currencies`,
    {
      schema: {
        description: 'Create a currency',
        tags: ['currencies'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code', 'name'],
          properties: {
            code: { type: 'string', minLength: 3, maxLength: 3 },
            name: { type: 'string', minLength: 1 },
            symbol: { type: 'string' },
            decimalPlaces: { type: 'integer', minimum: 0, maximum: 6 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_CURRENCY_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { code, name, symbol = '', decimalPlaces = 2 } = request.body;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO currencies (id, code, name, symbol, decimal_places, tenant_id)
        VALUES (${id}, ${code.toUpperCase()}, ${name}, ${symbol}, ${decimalPlaces}, ${tenantId})
      `;

      const rows = await fastify.sql<[CurrencyRow]>`SELECT * FROM currencies WHERE id = ${id}`;
      return reply.status(201).send(mapCurrency(rows[0]));
    },
  );

  // GET /currencies
  fastify.get(
    `${API_V1_PREFIX}/currencies`,
    {
      schema: { description: 'List currencies', tags: ['currencies'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(FI_CURRENCY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<CurrencyRow[]>`
        SELECT * FROM currencies WHERE tenant_id = ${tenantId} ORDER BY code
      `;
      return reply.send({ items: rows.map(mapCurrency), total: rows.length });
    },
  );

  // PUT /currencies/:id
  fastify.put<{ Params: { id: string }; Body: { name?: string; symbol?: string; isActive?: boolean } }>(
    `${API_V1_PREFIX}/currencies/:id`,
    {
      schema: {
        description: 'Update a currency',
        tags: ['currencies'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            symbol: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_CURRENCY_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { name, symbol, isActive } = request.body;

      const existing = await fastify.sql<[CurrencyRow?]>`
        SELECT * FROM currencies WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Currency ${id} not found.` });

      await fastify.sql`
        UPDATE currencies SET
          name = COALESCE(${name ?? null}, name),
          symbol = COALESCE(${symbol ?? null}, symbol),
          is_active = COALESCE(${isActive ?? null}, is_active),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      const rows = await fastify.sql<[CurrencyRow]>`SELECT * FROM currencies WHERE id = ${id}`;
      return reply.send(mapCurrency(rows[0]));
    },
  );

  // POST /exchange-rates
  fastify.post<{ Body: { fromCurrency: string; toCurrency: string; rate: string; effectiveDate: string; source?: string } }>(
    `${API_V1_PREFIX}/exchange-rates`,
    {
      schema: {
        description: 'Add exchange rate',
        tags: ['currencies'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['fromCurrency', 'toCurrency', 'rate', 'effectiveDate'],
          properties: {
            fromCurrency: { type: 'string', minLength: 3, maxLength: 3 },
            toCurrency: { type: 'string', minLength: 3, maxLength: 3 },
            rate: { type: 'string' },
            effectiveDate: { type: 'string', format: 'date' },
            source: { type: 'string', enum: ['manual', 'bot'] },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_CURRENCY_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { fromCurrency, toCurrency, rate, effectiveDate, source = 'manual' } = request.body;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO exchange_rates (id, from_currency, to_currency, rate, effective_date, source, tenant_id)
        VALUES (${id}, ${fromCurrency.toUpperCase()}, ${toCurrency.toUpperCase()}, ${rate}::numeric, ${effectiveDate}, ${source}, ${tenantId})
        ON CONFLICT (from_currency, to_currency, effective_date, tenant_id)
        DO UPDATE SET rate = ${rate}::numeric, source = ${source}, updated_at = NOW()
      `;

      const rows = await fastify.sql<[ExchangeRateRow]>`SELECT * FROM exchange_rates WHERE id = ${id}`;
      return reply.status(201).send(mapRate(rows[0]));
    },
  );

  // GET /exchange-rates
  fastify.get<{ Querystring: { fromCurrency?: string; toCurrency?: string; limit?: number } }>(
    `${API_V1_PREFIX}/exchange-rates`,
    {
      schema: {
        description: 'List exchange rates',
        tags: ['currencies'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            fromCurrency: { type: 'string' },
            toCurrency: { type: 'string' },
            limit: { type: 'integer', default: 50 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_CURRENCY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 50;
      const from = request.query.fromCurrency;
      const to = request.query.toCurrency;

      let rows: ExchangeRateRow[];
      if (from && to) {
        rows = await fastify.sql<ExchangeRateRow[]>`
          SELECT * FROM exchange_rates WHERE tenant_id = ${tenantId} AND from_currency = ${from} AND to_currency = ${to}
          ORDER BY effective_date DESC LIMIT ${limit}
        `;
      } else {
        rows = await fastify.sql<ExchangeRateRow[]>`
          SELECT * FROM exchange_rates WHERE tenant_id = ${tenantId}
          ORDER BY effective_date DESC LIMIT ${limit}
        `;
      }
      return reply.send({ items: rows.map(mapRate), total: rows.length });
    },
  );

  // GET /exchange-rates/convert — getRate(from, to, date)
  fastify.get<{ Querystring: { from: string; to: string; date?: string } }>(
    `${API_V1_PREFIX}/exchange-rates/convert`,
    {
      schema: {
        description: 'Get exchange rate for a specific date (latest on or before date)',
        tags: ['currencies'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['from', 'to'],
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            date: { type: 'string', format: 'date' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_CURRENCY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { from: fromCurrency, to: toCurrency, date } = request.query;
      const asOfDate = date ?? new Date().toISOString().slice(0, 10);

      // Same currency → rate 1
      if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
        return reply.send({ fromCurrency, toCurrency, rate: '1.000000', effectiveDate: asOfDate });
      }

      const rows = await fastify.sql<[{ rate: string; effective_date: string }?]>`
        SELECT rate, effective_date FROM exchange_rates
        WHERE tenant_id = ${tenantId}
          AND from_currency = ${fromCurrency.toUpperCase()}
          AND to_currency = ${toCurrency.toUpperCase()}
          AND effective_date <= ${asOfDate}
        ORDER BY effective_date DESC
        LIMIT 1
      `;

      if (!rows[0]) {
        throw new NotFoundError({ detail: `No exchange rate found for ${fromCurrency}→${toCurrency} on or before ${asOfDate}.` });
      }

      return reply.send({
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        rate: rows[0].rate,
        effectiveDate: rows[0].effective_date,
      });
    },
  );

  // POST /gl/fx-revaluation — revalue open items at month-end rate
  fastify.post<{ Body: { currencyCode: string; asOfDate: string; fiscalYear: number; fiscalPeriod: number } }>(
    `${API_V1_PREFIX}/gl/fx-revaluation`,
    {
      schema: {
        description: 'Revalue open foreign currency items at month-end exchange rate',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currencyCode', 'asOfDate', 'fiscalYear', 'fiscalPeriod'],
          properties: {
            currencyCode: { type: 'string' },
            asOfDate: { type: 'string', format: 'date' },
            fiscalYear: { type: 'integer' },
            fiscalPeriod: { type: 'integer' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { currencyCode, asOfDate, fiscalYear, fiscalPeriod } = request.body;

      // Get month-end rate
      const rateRow = await fastify.sql<[{ rate: string }?]>`
        SELECT rate FROM exchange_rates
        WHERE tenant_id = ${tenantId}
          AND from_currency = ${currencyCode.toUpperCase()}
          AND to_currency = 'THB'
          AND effective_date <= ${asOfDate}
        ORDER BY effective_date DESC LIMIT 1
      `;
      if (!rateRow[0]) {
        throw new NotFoundError({ detail: `No ${currencyCode}→THB rate found for ${asOfDate}.` });
      }
      const newRate = parseFloat(rateRow[0].rate);

      // Find open bills with this currency
      const openBills = await fastify.sql<Array<{ id: string; total_satang: string; exchange_rate: string; local_amount_satang: string }>>`
        SELECT id, total_satang::text, exchange_rate::text, local_amount_satang::text
        FROM bills
        WHERE tenant_id = ${tenantId} AND currency_code = ${currencyCode.toUpperCase()} AND status IN ('posted', 'partial')
      `;

      let totalGainLoss = 0n;
      const revaluedItems: Array<{ billId: string; oldLocalSatang: string; newLocalSatang: string; difference: string }> = [];

      for (const bill of openBills) {
        const foreignAmount = BigInt(bill.total_satang);
        const oldLocal = BigInt(bill.local_amount_satang);
        const newLocal = BigInt(Math.round(Number(foreignAmount) * newRate));
        const diff = newLocal - oldLocal;

        if (diff !== 0n) {
          totalGainLoss += diff;
          revaluedItems.push({
            billId: bill.id,
            oldLocalSatang: oldLocal.toString(),
            newLocalSatang: newLocal.toString(),
            difference: diff.toString(),
          });

          // Update local amount
          await fastify.sql`
            UPDATE bills SET local_amount_satang = ${newLocal.toString()}::bigint, exchange_rate = ${newRate}::numeric, updated_at = NOW()
            WHERE id = ${bill.id}
          `;
        }
      }

      // Create FX revaluation JE if there's a gain/loss
      let journalEntryId: string | null = null;
      if (totalGainLoss !== 0n) {
        journalEntryId = crypto.randomUUID();
        const docNum = `JE-FX-${Date.now()}`;

        await fastify.sql`
          INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at)
          VALUES (${journalEntryId}, ${docNum}, ${'FX Revaluation ' + currencyCode + ' ' + asOfDate}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, NOW())
        `;

        // Find unrealized FX gain/loss account (code 4300 for gain, 5300 for loss)
        const isGain = totalGainLoss > 0n;
        const absAmount = isGain ? totalGainLoss : -totalGainLoss;

        // Dr AP (increase local AP) / Cr FX Gain — OR — Dr FX Loss / Cr AP (decrease local AP)
        // Simplified: use two lines — AP account and FX Gain/Loss
        const lineId1 = crypto.randomUUID();
        const lineId2 = crypto.randomUUID();

        // Line 1: Debit side
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
          VALUES (${lineId1}, ${journalEntryId}, 1,
            COALESCE((SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE ${isGain ? '2100%' : '5300%'} LIMIT 1), 'unknown'),
            ${'FX Revaluation ' + (isGain ? 'AP adjustment' : 'FX Loss')},
            ${absAmount.toString()}::bigint, 0::bigint)
        `;

        // Line 2: Credit side
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
          VALUES (${lineId2}, ${journalEntryId}, 2,
            COALESCE((SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE ${isGain ? '4300%' : '2100%'} LIMIT 1), 'unknown'),
            ${'FX Revaluation ' + (isGain ? 'FX Gain' : 'AP adjustment')},
            0::bigint, ${absAmount.toString()}::bigint)
        `;
      }

      return reply.send({
        currencyCode,
        asOfDate,
        newRate: rateRow[0].rate,
        revaluedCount: revaluedItems.length,
        totalGainLossSatang: totalGainLoss.toString(),
        journalEntryId,
        items: revaluedItems,
      });
    },
  );
}
