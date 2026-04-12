/**
 * Fiscal Year and Period routes:
 *   GET  /api/v1/fiscal-years           — list fiscal years
 *   POST /api/v1/fiscal-years           — create fiscal year
 *   POST /api/v1/fiscal-periods/:id/close  — close period
 *   POST /api/v1/fiscal-periods/:id/reopen — reopen period
 *
 * Story 4.5a — GL + CoA + Fiscal API Routes
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ConflictError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { toISO } from '../../lib/to-iso.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { GL_PERIOD_READ, GL_PERIOD_CLOSE } from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const fiscalYearResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    year: { type: 'integer' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    periods: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          periodNumber: { type: 'integer' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['open', 'closed'] },
        },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const createFiscalYearBodySchema = {
  type: 'object',
  required: ['year', 'startDate', 'endDate'],
  additionalProperties: false,
  properties: {
    year: { type: 'integer', minimum: 2000, maximum: 2100 },
    startDate: { type: 'string', format: 'date', description: 'YYYY-MM-DD' },
    endDate: { type: 'string', format: 'date', description: 'YYYY-MM-DD' },
  },
} as const;

const periodResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    periodNumber: { type: 'integer' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    status: { type: 'string', enum: ['open', 'closed'] },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateFiscalYearBody {
  year: number;
  startDate: string;
  endDate: string;
}

interface IdParams {
  id: string;
}

interface FiscalYearRow {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface FiscalPeriodRow {
  id: string;
  fiscal_year_id: string;
  period_number: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function fiscalRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // GET /api/v1/fiscal-years
  fastify.get(
    `${API_V1_PREFIX}/fiscal-years`,
    {
      schema: {
        description: 'List fiscal years for the current tenant',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'List of fiscal years with periods',
            type: 'object',
            properties: {
              items: { type: 'array', items: fiscalYearResponseSchema },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(GL_PERIOD_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      const fiscalYears = await fastify.sql<FiscalYearRow[]>`
        SELECT * FROM fiscal_years WHERE tenant_id = ${tenantId} ORDER BY year DESC
      `;

      const items = [];
      for (const fy of fiscalYears) {
        const periods = await fastify.sql<FiscalPeriodRow[]>`
          SELECT * FROM fiscal_periods WHERE fiscal_year_id = ${fy.id} ORDER BY period_number ASC
        `;

        items.push({
          id: fy.id,
          year: fy.year,
          startDate: fy.start_date,
          endDate: fy.end_date,
          periods: periods.map((p) => ({
            id: p.id,
            periodNumber: p.period_number,
            startDate: p.start_date,
            endDate: p.end_date,
            status: p.status,
          })),
          createdAt: toISO(fy.created_at),
        });
      }

      return reply.status(200).send({ items });
    },
  );

  // POST /api/v1/fiscal-years
  fastify.post<{ Body: CreateFiscalYearBody }>(
    `${API_V1_PREFIX}/fiscal-years`,
    {
      schema: {
        description: 'Create a new fiscal year with 12 monthly periods',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        body: createFiscalYearBodySchema,
        response: { 201: { description: 'Fiscal year created', ...fiscalYearResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(GL_PERIOD_CLOSE)],
    },
    async (request, reply) => {
      const { year, startDate, endDate } = request.body;
      const { tenantId } = request.user;

      // Check for duplicate year.
      const existing = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM fiscal_years WHERE tenant_id = ${tenantId} AND year = ${year} LIMIT 1
      `;
      if (existing.length > 0) {
        throw new ConflictError({
          detail: `Fiscal year ${year} already exists for this organization.`,
        });
      }

      const fyId = crypto.randomUUID();
      const fyRows = await fastify.sql<[FiscalYearRow?]>`
        INSERT INTO fiscal_years (id, year, start_date, end_date, tenant_id)
        VALUES (${fyId}, ${year}, ${startDate}, ${endDate}, ${tenantId})
        RETURNING *
      `;
      const fy = fyRows[0];
      if (!fy) {
        throw new Error('Failed to create fiscal year.');
      }

      // Auto-generate 12 monthly periods.
      const start = new Date(startDate);
      const createdPeriods: Array<{
        id: string;
        periodNumber: number;
        startDate: string;
        endDate: string;
        status: string;
      }> = [];

      for (let i = 0; i < 12; i++) {
        const periodId = crypto.randomUUID();
        const periodStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const periodEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0);

        await fastify.sql`
          INSERT INTO fiscal_periods (id, fiscal_year_id, period_number, start_date, end_date, status)
          VALUES (${periodId}, ${fyId}, ${i + 1}, ${periodStart.toISOString().slice(0, 10)}, ${periodEnd.toISOString().slice(0, 10)}, 'open')
        `;

        createdPeriods.push({
          id: periodId,
          periodNumber: i + 1,
          startDate: periodStart.toISOString().slice(0, 10),
          endDate: periodEnd.toISOString().slice(0, 10),
          status: 'open',
        });
      }

      request.log.info({ fyId, year, tenantId }, 'Fiscal year created');

      return reply.status(201).send({
        id: fy.id,
        year: fy.year,
        startDate: fy.start_date,
        endDate: fy.end_date,
        periods: createdPeriods,
        createdAt: toISO(fy.created_at),
      });
    },
  );

  // POST /api/v1/fiscal-periods/:id/close
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/fiscal-periods/:id/close`,
    {
      schema: {
        description: 'Close a fiscal period (blocks new journal postings to this period)',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Period closed', ...periodResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(GL_PERIOD_CLOSE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      // Verify the period belongs to this tenant via fiscal_year.
      const rows = await fastify.sql<[FiscalPeriodRow?]>`
        UPDATE fiscal_periods fp
        SET status = 'closed', updated_at = NOW()
        FROM fiscal_years fy
        WHERE fp.id = ${id}
          AND fp.fiscal_year_id = fy.id
          AND fy.tenant_id = ${tenantId}
          AND fp.status = 'open'
        RETURNING fp.*
      `;

      const period = rows[0];
      if (!period) {
        // Check existence.
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT fp.id, fp.status FROM fiscal_periods fp
          JOIN fiscal_years fy ON fp.fiscal_year_id = fy.id
          WHERE fp.id = ${id} AND fy.tenant_id = ${tenantId}
          LIMIT 1
        `;
        if (!existing[0]) {
          throw new NotFoundError({ detail: `Fiscal period ${id} not found.` });
        }
        throw new ValidationError({
          detail: `Period ${id} is already closed.`,
        });
      }

      request.log.info({ periodId: id, tenantId }, 'Fiscal period closed');

      return reply.status(200).send({
        id: period.id,
        periodNumber: period.period_number,
        startDate: period.start_date,
        endDate: period.end_date,
        status: period.status,
        updatedAt: toISO(period.updated_at),
      });
    },
  );

  // POST /api/v1/fiscal-periods/:id/reopen
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/fiscal-periods/:id/reopen`,
    {
      schema: {
        description: 'Reopen a closed fiscal period',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Period reopened', ...periodResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(GL_PERIOD_CLOSE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[FiscalPeriodRow?]>`
        UPDATE fiscal_periods fp
        SET status = 'open', updated_at = NOW()
        FROM fiscal_years fy
        WHERE fp.id = ${id}
          AND fp.fiscal_year_id = fy.id
          AND fy.tenant_id = ${tenantId}
          AND fp.status = 'closed'
        RETURNING fp.*
      `;

      const period = rows[0];
      if (!period) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT fp.id, fp.status FROM fiscal_periods fp
          JOIN fiscal_years fy ON fp.fiscal_year_id = fy.id
          WHERE fp.id = ${id} AND fy.tenant_id = ${tenantId}
          LIMIT 1
        `;
        if (!existing[0]) {
          throw new NotFoundError({ detail: `Fiscal period ${id} not found.` });
        }
        throw new ValidationError({
          detail: `Period ${id} is already open.`,
        });
      }

      request.log.info({ periodId: id, tenantId }, 'Fiscal period reopened');

      return reply.status(200).send({
        id: period.id,
        periodNumber: period.period_number,
        startDate: period.start_date,
        endDate: period.end_date,
        status: period.status,
        updatedAt: toISO(period.updated_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/fiscal-years/:id/close — Year-End Closing
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/fiscal-years/:id/close`,
    {
      schema: {
        description: 'Year-end closing: validates all periods closed, creates closing JE (zeroes Revenue/Expense) and carry-forward JE (Retained Earnings), marks year closed',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: {
            description: 'Fiscal year closed with closing journal entries',
            type: 'object',
            properties: {
              fiscalYear: fiscalYearResponseSchema,
              closingJournalEntry: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  documentNumber: { type: 'string' },
                  description: { type: 'string' },
                  lines: { type: 'array', items: { type: 'object' } },
                },
              },
              carryForwardJournalEntry: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  documentNumber: { type: 'string' },
                  description: { type: 'string' },
                  netIncomeSatang: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(GL_PERIOD_CLOSE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      // 1. Validate fiscal year exists and belongs to tenant
      const fyRows = await fastify.sql<[FiscalYearRow?]>`
        SELECT * FROM fiscal_years WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const fy = fyRows[0];
      if (!fy) {
        throw new NotFoundError({ detail: `Fiscal year ${id} not found.` });
      }

      if (fy.status === 'closed') {
        throw new ConflictError({ detail: `Fiscal year ${fy.year} is already closed.` });
      }

      // 2. Validate all 12 periods are closed
      const openPeriods = await fastify.sql<[{ count: string }?]>`
        SELECT count(*)::text as count FROM fiscal_periods
        WHERE fiscal_year_id = ${id} AND status = 'open'
      `;
      const openCount = parseInt(openPeriods[0]?.count ?? '0', 10);
      if (openCount > 0) {
        throw new ConflictError({
          detail: `Cannot close fiscal year — there are still ${String(openCount)} open period(s). Close all periods first.`,
        });
      }

      // 3. Calculate net income: sum all posted JE lines for Revenue and Expense accounts
      //    Revenue accounts: credit_satang - debit_satang (net credit = income)
      //    Expense accounts: debit_satang - credit_satang (net debit = expense)
      interface AccountBalanceRow {
        account_id: string;
        account_type: string;
        code: string;
        name_en: string;
        total_debit: string;
        total_credit: string;
      }

      const accountBalances = await fastify.sql<AccountBalanceRow[]>`
        SELECT
          coa.id AS account_id,
          coa.account_type,
          coa.code,
          coa.name_en,
          COALESCE(SUM(jel.debit_satang), 0)::text AS total_debit,
          COALESCE(SUM(jel.credit_satang), 0)::text AS total_credit
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.entry_id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.fiscal_year = ${fy.year}
          AND je.status = 'posted'
          AND coa.account_type IN ('revenue', 'expense')
        GROUP BY coa.id, coa.account_type, coa.code, coa.name_en
        ORDER BY coa.code
      `;

      // Separate revenue and expense accounts
      const revenueAccounts = accountBalances.filter((a) => a.account_type === 'revenue');
      const expenseAccounts = accountBalances.filter((a) => a.account_type === 'expense');

      // Calculate net income in satang
      // Revenue: net credit balance = total_credit - total_debit
      let totalRevenue = 0n;
      for (const acc of revenueAccounts) {
        totalRevenue += BigInt(acc.total_credit) - BigInt(acc.total_debit);
      }

      // Expense: net debit balance = total_debit - total_credit
      let totalExpense = 0n;
      for (const acc of expenseAccounts) {
        totalExpense += BigInt(acc.total_debit) - BigInt(acc.total_credit);
      }

      const netIncome = totalRevenue - totalExpense; // positive = profit, negative = loss

      // 4. Find Retained Earnings account (code 3200 or first equity account)
      const retainedEarningsRows = await fastify.sql<[{ id: string; code: string }?]>`
        SELECT id, code FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND account_type = 'equity' AND is_active = true
          AND code LIKE '3200%'
        ORDER BY code ASC LIMIT 1
      `;
      let retainedEarningsId = retainedEarningsRows[0]?.id ?? null;

      // Fallback: any equity account
      if (!retainedEarningsId) {
        const fallbackRows = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM chart_of_accounts
          WHERE tenant_id = ${tenantId} AND account_type = 'equity' AND is_active = true
          ORDER BY code ASC LIMIT 1
        `;
        retainedEarningsId = fallbackRows[0]?.id ?? null;
      }

      if (!retainedEarningsId) {
        throw new ValidationError({
          detail: 'No equity account found for Retained Earnings. Please create an equity account (code 3200) first.',
        });
      }

      // H-6 FIX: Check if there are any non-zero revenue/expense balances
      const hasNonZeroAccounts = accountBalances.some((acc) => {
        const netBalance = acc.account_type === 'revenue'
          ? BigInt(acc.total_credit) - BigInt(acc.total_debit)
          : BigInt(acc.total_debit) - BigInt(acc.total_credit);
        return netBalance !== 0n;
      });

      let closingJeId: string | null = null;
      let closingDocNumber: string | null = null;
      const closingLines: Array<{
        lineNumber: number;
        accountId: string;
        accountCode: string;
        description: string;
        debitSatang: string;
        creditSatang: string;
      }> = [];

      if (hasNonZeroAccounts) {
        // 5. Create Closing JE: Dr all Revenue accounts / Cr all Expense accounts → zero them out
        closingJeId = crypto.randomUUID();
        closingDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fy.year);

        await fastify.sql`
          INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at)
          VALUES (
            ${closingJeId}, ${closingDocNumber},
            ${'Year-end closing entry for fiscal year ' + String(fy.year)},
            'posted', ${fy.year}, 12,
            ${tenantId}, ${userId}, NOW()
          )
        `;

        let lineNum = 1;

        // Dr Revenue accounts (to zero out their credit balances)
        for (const acc of revenueAccounts) {
          const netBalance = BigInt(acc.total_credit) - BigInt(acc.total_debit);
          if (netBalance === 0n) continue;

          const debit = netBalance > 0n ? netBalance.toString() : '0';
          const credit = netBalance < 0n ? (-netBalance).toString() : '0';

          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${closingJeId}, ${lineNum}, ${acc.account_id},
                    ${'Close revenue: ' + acc.name_en}, ${debit}::bigint, ${credit}::bigint)
          `;
          closingLines.push({
            lineNumber: lineNum,
            accountId: acc.account_id,
            accountCode: acc.code,
            description: 'Close revenue: ' + acc.name_en,
            debitSatang: debit,
            creditSatang: credit,
          });
          lineNum++;
        }

        // Cr Expense accounts (to zero out their debit balances)
        for (const acc of expenseAccounts) {
          const netBalance = BigInt(acc.total_debit) - BigInt(acc.total_credit);
          if (netBalance === 0n) continue;

          const debit = netBalance < 0n ? (-netBalance).toString() : '0';
          const credit = netBalance > 0n ? netBalance.toString() : '0';

          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${closingJeId}, ${lineNum}, ${acc.account_id},
                    ${'Close expense: ' + acc.name_en}, ${debit}::bigint, ${credit}::bigint)
          `;
          closingLines.push({
            lineNumber: lineNum,
            accountId: acc.account_id,
            accountCode: acc.code,
            description: 'Close expense: ' + acc.name_en,
            debitSatang: debit,
            creditSatang: credit,
          });
          lineNum++;
        }

        // Balance to Income Summary / Retained Earnings in the closing JE
        // Net income goes to RE: if profit → Cr RE; if loss → Dr RE
        if (netIncome !== 0n) {
          const reDebit = netIncome < 0n ? (-netIncome).toString() : '0';
          const reCredit = netIncome > 0n ? netIncome.toString() : '0';

          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (${crypto.randomUUID()}, ${closingJeId}, ${lineNum}, ${retainedEarningsId},
                    ${'Net income to Retained Earnings — FY' + String(fy.year)}, ${reDebit}::bigint, ${reCredit}::bigint)
          `;
          closingLines.push({
            lineNumber: lineNum,
            accountId: retainedEarningsId,
            accountCode: 'RE',
            description: 'Net income to Retained Earnings — FY' + String(fy.year),
            debitSatang: reDebit,
            creditSatang: reCredit,
          });
        }
      }

      // 6. Mark fiscal year as closed
      const updatedRows = await fastify.sql<[FiscalYearRow?]>`
        UPDATE fiscal_years SET status = 'closed', closing_je_id = ${closingJeId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      const updated = updatedRows[0];
      if (!updated) throw new NotFoundError({ detail: `Fiscal year ${id} not found.` });

      const periods = await fastify.sql<FiscalPeriodRow[]>`
        SELECT * FROM fiscal_periods WHERE fiscal_year_id = ${id} ORDER BY period_number ASC
      `;

      request.log.info(
        { fiscalYearId: id, closingJeId, netIncomeSatang: netIncome.toString(), tenantId },
        closingJeId ? 'Fiscal year closed with closing JE' : 'Fiscal year closed — no closing entry needed (zero balances)',
      );

      return reply.status(200).send({
        fiscalYear: {
          id: updated.id,
          year: updated.year,
          startDate: updated.start_date,
          endDate: updated.end_date,
          periods: periods.map((p) => ({
            id: p.id,
            periodNumber: p.period_number,
            startDate: p.start_date,
            endDate: p.end_date,
            status: p.status,
          })),
          createdAt: toISO(updated.created_at),
        },
        closingJournalEntry: closingJeId ? {
          id: closingJeId,
          documentNumber: closingDocNumber,
          description: 'Year-end closing entry for fiscal year ' + String(fy.year),
          lines: closingLines,
        } : null,
        carryForwardJournalEntry: closingJeId ? {
          id: closingJeId,
          documentNumber: closingDocNumber,
          description: 'Net income carried forward to Retained Earnings',
          netIncomeSatang: netIncome.toString(),
        } : {
          id: null,
          documentNumber: null,
          description: 'No closing entry needed — no revenue/expense balances for FY' + String(fy.year),
          netIncomeSatang: '0',
        },
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/fiscal-years/:id/reopen — Reopen a closed fiscal year
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/fiscal-years/:id/reopen`,
    {
      schema: {
        description: 'Reopen a closed fiscal year for corrections. Reverses the closing JE and sets year status back to open.',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: {
            description: 'Fiscal year reopened',
            type: 'object',
            properties: {
              fiscalYear: fiscalYearResponseSchema,
              reversalJournalEntry: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  documentNumber: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(GL_PERIOD_CLOSE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      // 1. Validate fiscal year exists and is closed
      const fyRows = await fastify.sql<[(FiscalYearRow & { closing_je_id: string | null })?]>`
        SELECT * FROM fiscal_years WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const fy = fyRows[0];
      if (!fy) {
        throw new NotFoundError({ detail: `Fiscal year ${id} not found.` });
      }

      if (fy.status !== 'closed') {
        throw new ConflictError({
          detail: `Fiscal year ${fy.year} is not closed — current status is "${fy.status}".`,
        });
      }

      // 2. Reverse the closing JE if one exists
      let reversalJe: { id: string; documentNumber: string; description: string } | null = null;

      const closingJeId = fy.closing_je_id;
      if (closingJeId) {
        // Fetch original closing JE lines
        interface JeLineRow {
          line_number: number;
          account_id: string;
          description: string | null;
          debit_satang: string;
          credit_satang: string;
        }
        const closingLines = await fastify.sql<JeLineRow[]>`
          SELECT line_number, account_id, description, debit_satang::text, credit_satang::text
          FROM journal_entry_lines WHERE entry_id = ${closingJeId}
          ORDER BY line_number
        `;

        if (closingLines.length > 0) {
          // Mark original closing JE as reversed
          await fastify.sql`
            UPDATE journal_entries SET status = 'reversed', updated_at = NOW()
            WHERE id = ${closingJeId}
          `;

          // Create reversal JE with swapped debits/credits
          const reversalJeId = crypto.randomUUID();
          const reversalDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fy.year);
          const reversalDescription = 'Reversal of year-end closing — FY' + String(fy.year) + ' reopened';

          await fastify.sql`
            INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, reversed_entry_id, tenant_id, created_by, posted_at)
            VALUES (
              ${reversalJeId}, ${reversalDocNumber},
              ${reversalDescription},
              'posted', ${fy.year}, 12,
              ${closingJeId}, ${tenantId}, ${userId}, NOW()
            )
          `;

          // Create reversed lines (swap debit/credit)
          for (const line of closingLines) {
            await fastify.sql`
              INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
              VALUES (${crypto.randomUUID()}, ${reversalJeId}, ${line.line_number}, ${line.account_id},
                      ${line.description}, ${line.credit_satang}::bigint, ${line.debit_satang}::bigint)
            `;
          }

          reversalJe = {
            id: reversalJeId,
            documentNumber: reversalDocNumber,
            description: reversalDescription,
          };
        }
      }

      // 3. Reopen the fiscal year
      const updatedRows = await fastify.sql<[FiscalYearRow?]>`
        UPDATE fiscal_years SET status = 'open', closing_je_id = NULL, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      const updated = updatedRows[0];
      if (!updated) throw new NotFoundError({ detail: `Fiscal year ${id} not found.` });

      // 4. Reopen all periods in this fiscal year
      await fastify.sql`
        UPDATE fiscal_periods SET status = 'open', updated_at = NOW()
        WHERE fiscal_year_id = ${id}
      `;

      const periods = await fastify.sql<FiscalPeriodRow[]>`
        SELECT * FROM fiscal_periods WHERE fiscal_year_id = ${id} ORDER BY period_number ASC
      `;

      request.log.info(
        { fiscalYearId: id, reversalJeId: reversalJe?.id ?? null, tenantId },
        'Fiscal year reopened',
      );

      return reply.status(200).send({
        fiscalYear: {
          id: updated.id,
          year: updated.year,
          startDate: updated.start_date,
          endDate: updated.end_date,
          periods: periods.map((p) => ({
            id: p.id,
            periodNumber: p.period_number,
            startDate: p.start_date,
            endDate: p.end_date,
            status: p.status,
          })),
          createdAt: toISO(updated.created_at),
        },
        reversalJournalEntry: reversalJe,
      });
    },
  );
}
