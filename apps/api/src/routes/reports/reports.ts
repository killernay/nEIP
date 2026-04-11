/**
 * Report generation routes:
 *   GET /api/v1/reports/balance-sheet      — Balance Sheet
 *   GET /api/v1/reports/income-statement   — Income Statement
 *   GET /api/v1/reports/trial-balance      — Trial Balance
 *   GET /api/v1/reports/budget-variance    — Budget vs Actual
 *   GET /api/v1/reports/equity-changes     — Equity Changes
 *   GET /api/v1/reports/ar-aging           — AR Aging Report
 *
 * Story 4.6 — Report Generation API
 *
 * All monetary values use Money VO format: { amountSatang: string, currency: "THB" }
 * Report generation target: < 30s
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  REPORT_BALANCE_SHEET_READ,
  REPORT_INCOME_STATEMENT_READ,
  REPORT_TRIAL_BALANCE_READ,
  REPORT_GL_READ,
  REPORT_AR_READ,
  REPORT_AP_READ,
  REPORT_PNL_COMPARISON_READ,
  REPORT_VAT_RETURN_READ,
  REPORT_SSC_FILING_READ,
} from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// Shared types / schemas
// ---------------------------------------------------------------------------

const moneySchema = {
  type: 'object',
  properties: {
    amountSatang: { type: 'string', description: 'Amount in satang (smallest currency unit)' },
    currency: { type: 'string', default: 'THB' },
  },
} as const;

const fiscalQuerySchema = {
  type: 'object',
  properties: {
    fiscalYear: { type: 'integer', description: 'Fiscal year to report on' },
    period: { type: 'integer', minimum: 1, maximum: 12, description: 'Fiscal period (1-12)' },
    asOfDate: { type: 'string', format: 'date', description: 'Report as-of date' },
  },
} as const;

interface FiscalQuery {
  fiscalYear?: number;
  period?: number;
  asOfDate?: string;
}

interface AccountBalanceRow {
  account_id: string;
  code: string;
  name_en: string;
  name_th: string;
  account_type: string;
  total_debit: string | null;
  total_credit: string | null;
}

interface BudgetRow {
  account_id: string;
  code: string;
  name_en: string;
  account_type: string;
  amount_satang: string;
}

// ---------------------------------------------------------------------------
// Helper: money value object
// ---------------------------------------------------------------------------

function money(amountSatang: bigint | string, currency = 'THB') {
  return {
    amountSatang: amountSatang.toString(),
    currency,
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function reportRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/v1/reports/balance-sheet
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: FiscalQuery }>(
    `${API_V1_PREFIX}/reports/balance-sheet`,
    {
      schema: {
        description: 'Generate Balance Sheet report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: fiscalQuerySchema,
        response: {
          200: {
            description: 'Balance Sheet report',
            type: 'object',
            properties: {
              reportName: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              fiscalYear: { type: 'integer' },
              period: { type: 'integer', nullable: true },
              assets: { type: 'array', items: { type: 'object' } },
              liabilities: { type: 'array', items: { type: 'object' } },
              equity: { type: 'array', items: { type: 'object' } },
              totalAssets: moneySchema,
              totalLiabilities: moneySchema,
              totalEquity: moneySchema,
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_BALANCE_SHEET_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const fiscalYear = request.query.fiscalYear ?? new Date().getFullYear();
      const period = request.query.period;

      // Query account balances from posted journal entries.
      let balanceRows: AccountBalanceRow[];
      if (period !== undefined) {
        balanceRows = await fastify.sql<AccountBalanceRow[]>`
          SELECT
            coa.id as account_id, coa.code, coa.name_en, coa.name_th, coa.account_type,
            COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
            COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
          FROM chart_of_accounts coa
          LEFT JOIN (
            SELECT jel2.account_id, jel2.debit_satang, jel2.credit_satang
            FROM journal_entry_lines jel2
            JOIN journal_entries je2 ON je2.id = jel2.entry_id
              AND je2.status = 'posted'
              AND je2.fiscal_year = ${fiscalYear}
              AND je2.fiscal_period <= ${period}
              AND je2.tenant_id = ${tenantId}
          ) jel ON jel.account_id = coa.id
          WHERE coa.tenant_id = ${tenantId}
            AND coa.account_type IN ('asset', 'liability', 'equity')
          GROUP BY coa.id, coa.code, coa.name_en, coa.name_th, coa.account_type
          ORDER BY coa.code
        `;
      } else {
        balanceRows = await fastify.sql<AccountBalanceRow[]>`
          SELECT
            coa.id as account_id, coa.code, coa.name_en, coa.name_th, coa.account_type,
            COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
            COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
          FROM chart_of_accounts coa
          LEFT JOIN (
            SELECT jel2.account_id, jel2.debit_satang, jel2.credit_satang
            FROM journal_entry_lines jel2
            JOIN journal_entries je2 ON je2.id = jel2.entry_id
              AND je2.status = 'posted'
              AND je2.fiscal_year = ${fiscalYear}
              AND je2.tenant_id = ${tenantId}
          ) jel ON jel.account_id = coa.id
          WHERE coa.tenant_id = ${tenantId}
            AND coa.account_type IN ('asset', 'liability', 'equity')
          GROUP BY coa.id, coa.code, coa.name_en, coa.name_th, coa.account_type
          ORDER BY coa.code
        `;
      }

      let totalAssets = 0n;
      let totalLiabilities = 0n;
      let totalEquity = 0n;

      const assets: Array<{ code: string; name: string; balance: ReturnType<typeof money> }> = [];
      const liabilities: Array<{ code: string; name: string; balance: ReturnType<typeof money> }> = [];
      const equity: Array<{ code: string; name: string; balance: ReturnType<typeof money> }> = [];

      for (const row of balanceRows) {
        const debit = BigInt(row.total_debit ?? '0');
        const credit = BigInt(row.total_credit ?? '0');
        // Assets have normal debit balance; liabilities/equity have normal credit balance.
        const balance = row.account_type === 'asset' ? debit - credit : credit - debit;

        const item = {
          code: row.code,
          name: row.name_en,
          nameTh: row.name_th,
          balance: money(balance),
        };

        switch (row.account_type) {
          case 'asset':
            assets.push(item);
            totalAssets += balance;
            break;
          case 'liability':
            liabilities.push(item);
            totalLiabilities += balance;
            break;
          case 'equity':
            equity.push(item);
            totalEquity += balance;
            break;
        }
      }

      return reply.status(200).send({
        reportName: 'Balance Sheet',
        generatedAt: new Date().toISOString(),
        fiscalYear,
        period: period ?? null,
        assets,
        liabilities,
        equity,
        totalAssets: money(totalAssets),
        totalLiabilities: money(totalLiabilities),
        totalEquity: money(totalEquity),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/income-statement
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: FiscalQuery }>(
    `${API_V1_PREFIX}/reports/income-statement`,
    {
      schema: {
        description: 'Generate Income Statement (Profit & Loss) report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: fiscalQuerySchema,
        response: {
          200: {
            description: 'Income Statement report',
            type: 'object',
            properties: {
              reportName: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              fiscalYear: { type: 'integer' },
              period: { type: 'integer', nullable: true },
              revenue: { type: 'array', items: { type: 'object' } },
              expenses: { type: 'array', items: { type: 'object' } },
              totalRevenue: moneySchema,
              totalExpenses: moneySchema,
              netIncome: moneySchema,
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_INCOME_STATEMENT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const fiscalYear = request.query.fiscalYear ?? new Date().getFullYear();
      const period = request.query.period;

      let balanceRows: AccountBalanceRow[];
      if (period !== undefined) {
        balanceRows = await fastify.sql<AccountBalanceRow[]>`
          SELECT
            coa.id as account_id, coa.code, coa.name_en, coa.name_th, coa.account_type,
            COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
            COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
          FROM chart_of_accounts coa
          LEFT JOIN (
            SELECT jel2.account_id, jel2.debit_satang, jel2.credit_satang
            FROM journal_entry_lines jel2
            JOIN journal_entries je2 ON je2.id = jel2.entry_id
              AND je2.status = 'posted'
              AND je2.fiscal_year = ${fiscalYear}
              AND je2.fiscal_period = ${period}
              AND je2.tenant_id = ${tenantId}
          ) jel ON jel.account_id = coa.id
          WHERE coa.tenant_id = ${tenantId}
            AND coa.account_type IN ('revenue', 'expense')
          GROUP BY coa.id, coa.code, coa.name_en, coa.name_th, coa.account_type
          ORDER BY coa.code
        `;
      } else {
        balanceRows = await fastify.sql<AccountBalanceRow[]>`
          SELECT
            coa.id as account_id, coa.code, coa.name_en, coa.name_th, coa.account_type,
            COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
            COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
          FROM chart_of_accounts coa
          LEFT JOIN (
            SELECT jel2.account_id, jel2.debit_satang, jel2.credit_satang
            FROM journal_entry_lines jel2
            JOIN journal_entries je2 ON je2.id = jel2.entry_id
              AND je2.status = 'posted'
              AND je2.fiscal_year = ${fiscalYear}
              AND je2.tenant_id = ${tenantId}
          ) jel ON jel.account_id = coa.id
          WHERE coa.tenant_id = ${tenantId}
            AND coa.account_type IN ('revenue', 'expense')
          GROUP BY coa.id, coa.code, coa.name_en, coa.name_th, coa.account_type
          ORDER BY coa.code
        `;
      }

      let totalRevenue = 0n;
      let totalExpenses = 0n;

      const revenue: Array<{ code: string; name: string; amount: ReturnType<typeof money> }> = [];
      const expenses: Array<{ code: string; name: string; amount: ReturnType<typeof money> }> = [];

      for (const row of balanceRows) {
        const debit = BigInt(row.total_debit ?? '0');
        const credit = BigInt(row.total_credit ?? '0');

        if (row.account_type === 'revenue') {
          const amount = credit - debit; // Revenue has normal credit balance
          revenue.push({ code: row.code, name: row.name_en, amount: money(amount) });
          totalRevenue += amount;
        } else {
          const amount = debit - credit; // Expenses have normal debit balance
          expenses.push({ code: row.code, name: row.name_en, amount: money(amount) });
          totalExpenses += amount;
        }
      }

      return reply.status(200).send({
        reportName: 'Income Statement',
        generatedAt: new Date().toISOString(),
        fiscalYear,
        period: period ?? null,
        revenue,
        expenses,
        totalRevenue: money(totalRevenue),
        totalExpenses: money(totalExpenses),
        netIncome: money(totalRevenue - totalExpenses),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/trial-balance
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: FiscalQuery }>(
    `${API_V1_PREFIX}/reports/trial-balance`,
    {
      schema: {
        description: 'Generate Trial Balance report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: fiscalQuerySchema,
        response: {
          200: {
            description: 'Trial Balance report',
            type: 'object',
            properties: {
              reportName: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              fiscalYear: { type: 'integer' },
              accounts: { type: 'array', items: { type: 'object' } },
              totalDebits: moneySchema,
              totalCredits: moneySchema,
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_TRIAL_BALANCE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const fiscalYear = request.query.fiscalYear ?? new Date().getFullYear();

      const balanceRows = await fastify.sql<AccountBalanceRow[]>`
        SELECT
          coa.id as account_id, coa.code, coa.name_en, coa.name_th, coa.account_type,
          COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
          COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
        FROM chart_of_accounts coa
        LEFT JOIN (
          SELECT jel2.account_id, jel2.debit_satang, jel2.credit_satang
          FROM journal_entry_lines jel2
          JOIN journal_entries je2 ON je2.id = jel2.entry_id
            AND je2.status = 'posted'
            AND je2.fiscal_year = ${fiscalYear}
            AND je2.tenant_id = ${tenantId}
        ) jel ON jel.account_id = coa.id
        WHERE coa.tenant_id = ${tenantId}
          AND coa.is_active = true
        GROUP BY coa.id, coa.code, coa.name_en, coa.name_th, coa.account_type
        ORDER BY coa.code
      `;

      let totalDebits = 0n;
      let totalCredits = 0n;

      const accounts = balanceRows.map((row) => {
        const debit = BigInt(row.total_debit ?? '0');
        const credit = BigInt(row.total_credit ?? '0');
        totalDebits += debit;
        totalCredits += credit;

        return {
          code: row.code,
          name: row.name_en,
          nameTh: row.name_th,
          accountType: row.account_type,
          debit: money(debit),
          credit: money(credit),
        };
      });

      return reply.status(200).send({
        reportName: 'Trial Balance',
        generatedAt: new Date().toISOString(),
        fiscalYear,
        accounts,
        totalDebits: money(totalDebits),
        totalCredits: money(totalCredits),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/budget-variance
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: FiscalQuery }>(
    `${API_V1_PREFIX}/reports/budget-variance`,
    {
      schema: {
        description: 'Generate Budget vs Actual variance report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: fiscalQuerySchema,
        response: {
          200: {
            description: 'Budget Variance report',
            type: 'object',
            properties: {
              reportName: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              fiscalYear: { type: 'integer' },
              items: { type: 'array', items: { type: 'object' } },
              totalBudget: moneySchema,
              totalActual: moneySchema,
              totalVariance: moneySchema,
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const fiscalYear = request.query.fiscalYear ?? new Date().getFullYear();

      // Get budgets for the fiscal year.
      const budgetRows = await fastify.sql<BudgetRow[]>`
        SELECT b.account_id, coa.code, coa.name_en, coa.account_type, b.amount_satang::text
        FROM budgets b
        JOIN chart_of_accounts coa ON coa.id = b.account_id
        WHERE b.tenant_id = ${tenantId} AND b.fiscal_year = ${fiscalYear}
        ORDER BY coa.code
      `;

      // Get actual amounts from posted journal entries.
      const actualRows = await fastify.sql<AccountBalanceRow[]>`
        SELECT
          coa.id as account_id, coa.code, coa.name_en, coa.name_th, coa.account_type,
          COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
          COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
        FROM chart_of_accounts coa
        JOIN journal_entry_lines jel ON jel.account_id = coa.id
        JOIN journal_entries je ON je.id = jel.entry_id
          AND je.status = 'posted'
          AND je.fiscal_year = ${fiscalYear}
          AND je.tenant_id = ${tenantId}
        WHERE coa.tenant_id = ${tenantId}
        GROUP BY coa.id, coa.code, coa.name_en, coa.name_th, coa.account_type
      `;

      // Build a map of actuals by account_id.
      const actualMap = new Map<string, bigint>();
      for (const row of actualRows) {
        const debit = BigInt(row.total_debit ?? '0');
        const credit = BigInt(row.total_credit ?? '0');
        // For expense accounts, actual = debit - credit; for revenue, actual = credit - debit.
        const actual = row.account_type === 'expense' ? debit - credit : credit - debit;
        actualMap.set(row.account_id, actual);
      }

      let totalBudget = 0n;
      let totalActual = 0n;
      let totalVariance = 0n;

      const items = budgetRows.map((bRow) => {
        const budgetAmount = BigInt(bRow.amount_satang);
        const actual = actualMap.get(bRow.account_id) ?? 0n;
        const variance = budgetAmount - actual;

        totalBudget += budgetAmount;
        totalActual += actual;
        totalVariance += variance;

        return {
          code: bRow.code,
          name: bRow.name_en,
          accountType: bRow.account_type,
          budget: money(budgetAmount),
          actual: money(actual),
          variance: money(variance),
          variancePercent: budgetAmount === 0n ? 0 : Number((variance * 10000n) / budgetAmount) / 100,
        };
      });

      return reply.status(200).send({
        reportName: 'Budget Variance',
        generatedAt: new Date().toISOString(),
        fiscalYear,
        items,
        totalBudget: money(totalBudget),
        totalActual: money(totalActual),
        totalVariance: money(totalVariance),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/equity-changes
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: FiscalQuery }>(
    `${API_V1_PREFIX}/reports/equity-changes`,
    {
      schema: {
        description: 'Generate Statement of Changes in Equity report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: fiscalQuerySchema,
        response: {
          200: {
            description: 'Equity Changes report',
            type: 'object',
            properties: {
              reportName: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              fiscalYear: { type: 'integer' },
              items: { type: 'array', items: { type: 'object' } },
              openingBalance: moneySchema,
              closingBalance: moneySchema,
              netChange: moneySchema,
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const fiscalYear = request.query.fiscalYear ?? new Date().getFullYear();

      // Get equity account balances.
      const equityRows = await fastify.sql<AccountBalanceRow[]>`
        SELECT
          coa.id as account_id, coa.code, coa.name_en, coa.name_th, coa.account_type,
          COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
          COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
        FROM chart_of_accounts coa
        LEFT JOIN (
          SELECT jel2.account_id, jel2.debit_satang, jel2.credit_satang
          FROM journal_entry_lines jel2
          JOIN journal_entries je2 ON je2.id = jel2.entry_id
            AND je2.status = 'posted'
            AND je2.fiscal_year = ${fiscalYear}
            AND je2.tenant_id = ${tenantId}
        ) jel ON jel.account_id = coa.id
        WHERE coa.tenant_id = ${tenantId}
          AND coa.account_type = 'equity'
        GROUP BY coa.id, coa.code, coa.name_en, coa.name_th, coa.account_type
        ORDER BY coa.code
      `;

      // Get prior year equity balances for opening balance.
      const priorRows = await fastify.sql<AccountBalanceRow[]>`
        SELECT
          coa.id as account_id, coa.code, coa.name_en, coa.name_th, coa.account_type,
          COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
          COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
        FROM chart_of_accounts coa
        LEFT JOIN (
          SELECT jel2.account_id, jel2.debit_satang, jel2.credit_satang
          FROM journal_entry_lines jel2
          JOIN journal_entries je2 ON je2.id = jel2.entry_id
            AND je2.status = 'posted'
            AND je2.fiscal_year < ${fiscalYear}
            AND je2.tenant_id = ${tenantId}
        ) jel ON jel.account_id = coa.id
        WHERE coa.tenant_id = ${tenantId}
          AND coa.account_type = 'equity'
        GROUP BY coa.id, coa.code, coa.name_en, coa.name_th, coa.account_type
      `;

      const priorMap = new Map<string, bigint>();
      let openingBalance = 0n;
      for (const row of priorRows) {
        const balance = BigInt(row.total_credit ?? '0') - BigInt(row.total_debit ?? '0');
        priorMap.set(row.account_id, balance);
        openingBalance += balance;
      }

      let closingBalance = 0n;
      const items = equityRows.map((row) => {
        const currentPeriod = BigInt(row.total_credit ?? '0') - BigInt(row.total_debit ?? '0');
        const opening = priorMap.get(row.account_id) ?? 0n;
        const closing = opening + currentPeriod;
        closingBalance += closing;

        return {
          code: row.code,
          name: row.name_en,
          nameTh: row.name_th,
          openingBalance: money(opening),
          changes: money(currentPeriod),
          closingBalance: money(closing),
        };
      });

      return reply.status(200).send({
        reportName: 'Statement of Changes in Equity',
        generatedAt: new Date().toISOString(),
        fiscalYear,
        items,
        openingBalance: money(openingBalance),
        closingBalance: money(closingBalance),
        netChange: money(closingBalance - openingBalance),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/ar-aging
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: FiscalQuery }>(
    `${API_V1_PREFIX}/reports/ar-aging`,
    {
      schema: {
        description: 'Generate AR Aging report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            asOfDate: { type: 'string', format: 'date', description: 'Aging as-of date (defaults to today)' },
          },
        },
        response: {
          200: {
            description: 'AR Aging report',
            type: 'object',
            properties: {
              reportName: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              asOfDate: { type: 'string', format: 'date' },
              buckets: {
                type: 'object',
                properties: {
                  current: moneySchema,
                  days1to30: moneySchema,
                  days31to60: moneySchema,
                  days61to90: moneySchema,
                  over90: moneySchema,
                },
              },
              total: moneySchema,
              customers: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_AR_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const asOfDate = request.query.asOfDate ?? new Date().toISOString().slice(0, 10);
      const asOfDateObj = new Date(asOfDate);

      interface InvoiceAgingRow {
        id: string; invoice_number: string; customer_id: string;
        customer_name: string; total_satang: string;
        paid_satang: string; due_date: string;
      }

      const invoiceRows = await fastify.sql<InvoiceAgingRow[]>`
        SELECT
          i.id, i.invoice_number, i.customer_id,
          COALESCE(c.company_name, 'Unknown') as customer_name,
          i.total_satang::text, i.paid_satang::text, i.due_date
        FROM invoices i
        LEFT JOIN contacts c ON c.id = i.customer_id
        WHERE i.tenant_id = ${tenantId}
          AND i.status IN ('posted', 'sent', 'partial', 'overdue')
        ORDER BY i.due_date ASC
      `;

      let current = 0n, days1to30 = 0n, days31to60 = 0n, days61to90 = 0n, over90 = 0n;

      const customerMap = new Map<string, {
        customerId: string; customerName: string;
        current: bigint; days1to30: bigint; days31to60: bigint;
        days61to90: bigint; over90: bigint; total: bigint;
        invoices: Array<{ invoiceNumber: string; outstandingSatang: string; dueDate: string; daysOverdue: number }>;
      }>();

      for (const row of invoiceRows) {
        const outstanding = BigInt(row.total_satang) - BigInt(row.paid_satang);
        if (outstanding <= 0n) continue;

        const dueDate = new Date(row.due_date);
        const diffMs = asOfDateObj.getTime() - dueDate.getTime();
        const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        if (daysOverdue === 0) { current += outstanding; }
        else if (daysOverdue <= 30) { days1to30 += outstanding; }
        else if (daysOverdue <= 60) { days31to60 += outstanding; }
        else if (daysOverdue <= 90) { days61to90 += outstanding; }
        else { over90 += outstanding; }

        let entry = customerMap.get(row.customer_id);
        if (!entry) {
          entry = {
            customerId: row.customer_id, customerName: row.customer_name,
            current: 0n, days1to30: 0n, days31to60: 0n, days61to90: 0n, over90: 0n, total: 0n, invoices: [],
          };
          customerMap.set(row.customer_id, entry);
        }
        entry.total += outstanding;
        if (daysOverdue === 0) { entry.current += outstanding; }
        else if (daysOverdue <= 30) { entry.days1to30 += outstanding; }
        else if (daysOverdue <= 60) { entry.days31to60 += outstanding; }
        else if (daysOverdue <= 90) { entry.days61to90 += outstanding; }
        else { entry.over90 += outstanding; }

        entry.invoices.push({
          invoiceNumber: row.invoice_number, outstandingSatang: outstanding.toString(),
          dueDate: row.due_date, daysOverdue,
        });
      }

      const totalOutstanding = current + days1to30 + days31to60 + days61to90 + over90;

      const customers = [...customerMap.values()].map((c) => ({
        customerId: c.customerId, customerName: c.customerName,
        current: money(c.current), days1to30: money(c.days1to30),
        days31to60: money(c.days31to60), days61to90: money(c.days61to90),
        over90: money(c.over90), total: money(c.total), invoices: c.invoices,
      }));

      return reply.status(200).send({
        reportName: 'AR Aging',
        generatedAt: new Date().toISOString(),
        asOfDate,
        buckets: {
          current: money(current), days1to30: money(days1to30),
          days31to60: money(days31to60), days61to90: money(days61to90),
          over90: money(over90),
        },
        total: money(totalOutstanding),
        customers,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/ap-aging
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: FiscalQuery }>(
    `${API_V1_PREFIX}/reports/ap-aging`,
    {
      schema: {
        description: 'Generate AP Aging report — outstanding bills by aging bucket',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            asOfDate: { type: 'string', format: 'date', description: 'Aging as-of date (defaults to today)' },
          },
        },
        response: {
          200: {
            description: 'AP Aging report',
            type: 'object',
            properties: {
              reportName: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              asOfDate: { type: 'string', format: 'date' },
              buckets: {
                type: 'object',
                properties: {
                  current: moneySchema,
                  days1to30: moneySchema,
                  days31to60: moneySchema,
                  days61to90: moneySchema,
                  over90: moneySchema,
                },
              },
              total: moneySchema,
              vendors: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_AP_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const asOfDate = request.query.asOfDate ?? new Date().toISOString().slice(0, 10);
      const asOfDateObj = new Date(asOfDate);

      // Query outstanding bills (posted or partial) for this tenant
      interface BillRow {
        id: string;
        document_number: string;
        vendor_id: string;
        vendor_name: string;
        total_satang: string;
        paid_satang: string;
        due_date: string;
      }

      const billRows = await fastify.sql<BillRow[]>`
        SELECT
          b.id, b.document_number, b.vendor_id, v.name as vendor_name,
          b.total_satang::text, b.paid_satang::text, b.due_date
        FROM bills b
        JOIN vendors v ON v.id = b.vendor_id
        WHERE b.tenant_id = ${tenantId}
          AND b.status IN ('posted', 'partial')
        ORDER BY b.due_date ASC
      `;

      // Aging buckets
      let current = 0n;
      let days1to30 = 0n;
      let days31to60 = 0n;
      let days61to90 = 0n;
      let over90 = 0n;

      // Vendor aggregation
      const vendorMap = new Map<string, {
        vendorId: string;
        vendorName: string;
        current: bigint;
        days1to30: bigint;
        days31to60: bigint;
        days61to90: bigint;
        over90: bigint;
        total: bigint;
        bills: Array<{
          documentNumber: string;
          outstandingSatang: string;
          dueDate: string;
          daysOverdue: number;
        }>;
      }>();

      for (const row of billRows) {
        const outstandingSatang = BigInt(row.total_satang) - BigInt(row.paid_satang);
        if (outstandingSatang <= 0n) continue;

        const dueDate = new Date(row.due_date);
        const diffMs = asOfDateObj.getTime() - dueDate.getTime();
        const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        // Assign to bucket
        if (daysOverdue === 0) {
          current += outstandingSatang;
        } else if (daysOverdue <= 30) {
          days1to30 += outstandingSatang;
        } else if (daysOverdue <= 60) {
          days31to60 += outstandingSatang;
        } else if (daysOverdue <= 90) {
          days61to90 += outstandingSatang;
        } else {
          over90 += outstandingSatang;
        }

        // Aggregate by vendor
        let vendorEntry = vendorMap.get(row.vendor_id);
        if (vendorEntry === undefined) {
          vendorEntry = {
            vendorId: row.vendor_id,
            vendorName: row.vendor_name,
            current: 0n,
            days1to30: 0n,
            days31to60: 0n,
            days61to90: 0n,
            over90: 0n,
            total: 0n,
            bills: [],
          };
          vendorMap.set(row.vendor_id, vendorEntry);
        }

        vendorEntry.total += outstandingSatang;
        if (daysOverdue === 0) {
          vendorEntry.current += outstandingSatang;
        } else if (daysOverdue <= 30) {
          vendorEntry.days1to30 += outstandingSatang;
        } else if (daysOverdue <= 60) {
          vendorEntry.days31to60 += outstandingSatang;
        } else if (daysOverdue <= 90) {
          vendorEntry.days61to90 += outstandingSatang;
        } else {
          vendorEntry.over90 += outstandingSatang;
        }

        vendorEntry.bills.push({
          documentNumber: row.document_number,
          outstandingSatang: outstandingSatang.toString(),
          dueDate: row.due_date,
          daysOverdue,
        });
      }

      const totalOutstanding = current + days1to30 + days31to60 + days61to90 + over90;

      const vendors = [...vendorMap.values()].map((v) => ({
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        current: money(v.current),
        days1to30: money(v.days1to30),
        days31to60: money(v.days31to60),
        days61to90: money(v.days61to90),
        over90: money(v.over90),
        total: money(v.total),
        bills: v.bills,
      }));

      return reply.status(200).send({
        reportName: 'AP Aging',
        generatedAt: new Date().toISOString(),
        asOfDate,
        buckets: {
          current: money(current),
          days1to30: money(days1to30),
          days31to60: money(days31to60),
          days61to90: money(days61to90),
          over90: money(over90),
        },
        total: money(totalOutstanding),
        vendors,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/pnl-comparison
  // -------------------------------------------------------------------------

  type PnlMode = 'monthly' | 'ytd' | 'yoy' | 'mom';

  interface PnlComparisonQuery {
    mode: PnlMode;
    fiscalYear: number;
    fiscalPeriod?: number;
    compareYear?: number;
  }

  /** A single P&L account row returned from the database for period queries. */
  interface PnlPeriodRow {
    account_id: string;
    code: string;
    name_th: string;
    account_type: string;
    fiscal_period: number;
    total_debit: string;
    total_credit: string;
  }

  /**
   * Query all revenue/expense lines for a given fiscal year (and optional
   * upper-period bound), grouped by account and fiscal period.
   */
  async function queryPnlByPeriod(
    fastifyInstance: FastifyInstance,
    tenantId: string,
    fiscalYear: number,
    maxPeriod?: number,
  ): Promise<PnlPeriodRow[]> {
    if (maxPeriod !== undefined) {
      return fastifyInstance.sql<PnlPeriodRow[]>`
        SELECT
          coa.id as account_id,
          coa.code,
          coa.name_th,
          coa.account_type,
          je.fiscal_period,
          COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
          COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
        FROM chart_of_accounts coa
        JOIN journal_entry_lines jel ON jel.account_id = coa.id
        JOIN journal_entries je ON je.id = jel.entry_id
          AND je.status = 'posted'
          AND je.fiscal_year = ${fiscalYear}
          AND je.fiscal_period <= ${maxPeriod}
          AND je.tenant_id = ${tenantId}
        WHERE coa.tenant_id = ${tenantId}
          AND coa.account_type IN ('revenue', 'expense')
        GROUP BY coa.id, coa.code, coa.name_th, coa.account_type, je.fiscal_period
        ORDER BY coa.code, je.fiscal_period
      `;
    }
    return fastifyInstance.sql<PnlPeriodRow[]>`
      SELECT
        coa.id as account_id,
        coa.code,
        coa.name_th,
        coa.account_type,
        je.fiscal_period,
        COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
        COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
      FROM chart_of_accounts coa
      JOIN journal_entry_lines jel ON jel.account_id = coa.id
      JOIN journal_entries je ON je.id = jel.entry_id
        AND je.status = 'posted'
        AND je.fiscal_year = ${fiscalYear}
        AND je.tenant_id = ${tenantId}
      WHERE coa.tenant_id = ${tenantId}
        AND coa.account_type IN ('revenue', 'expense')
      GROUP BY coa.id, coa.code, coa.name_th, coa.account_type, je.fiscal_period
      ORDER BY coa.code, je.fiscal_period
    `;
  }

  /**
   * Derive the "natural" amount sign from account type:
   *   revenue → credit - debit  (credit-normal)
   *   expense → debit - credit  (debit-normal)
   */
  function pnlAmount(accountType: string, debit: bigint, credit: bigint): bigint {
    return accountType === 'revenue' ? credit - debit : debit - credit;
  }

  fastify.get<{ Querystring: PnlComparisonQuery }>(
    `${API_V1_PREFIX}/reports/pnl-comparison`,
    {
      schema: {
        description: 'P&L comparison report — monthly, YTD, YoY, or MoM modes',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['mode', 'fiscalYear'],
          properties: {
            mode: { type: 'string', enum: ['monthly', 'ytd', 'yoy', 'mom'] },
            fiscalYear: { type: 'integer' },
            fiscalPeriod: { type: 'integer', minimum: 1, maximum: 12 },
            compareYear: { type: 'integer' },
          },
        },
        response: {
          200: {
            description: 'P&L comparison report',
            type: 'object',
            additionalProperties: true,
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_PNL_COMPARISON_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { mode, fiscalYear, fiscalPeriod, compareYear } = request.query;

      // ------------------------------------------------------------------
      // mode=monthly — all 12 periods side-by-side
      // mode=ytd     — cumulative through each period
      // ------------------------------------------------------------------
      if (mode === 'monthly' || mode === 'ytd') {
        const rows = await queryPnlByPeriod(fastify, tenantId, fiscalYear);

        // Map: accountId → { meta, amounts[12] }
        const accountMap = new Map<string, {
          code: string;
          nameTh: string;
          type: string;
          amounts: bigint[];
        }>();

        for (const row of rows) {
          const periodIdx = row.fiscal_period - 1; // 0-based
          if (periodIdx < 0 || periodIdx > 11) continue;

          let entry = accountMap.get(row.account_id);
          if (entry === undefined) {
            entry = {
              code: row.code,
              nameTh: row.name_th,
              type: row.account_type,
              amounts: Array.from({ length: 12 }, () => 0n),
            };
            accountMap.set(row.account_id, entry);
          }

          const debit = BigInt(row.total_debit);
          const credit = BigInt(row.total_credit);
          entry.amounts[periodIdx] = (entry.amounts[periodIdx] ?? 0n) + pnlAmount(row.account_type, debit, credit);
        }

        // Build per-period revenue/expense/net summary arrays
        const summaryRevenue = Array.from({ length: 12 }, () => 0n);
        const summaryExpenses = Array.from({ length: 12 }, () => 0n);

        const accounts = [...accountMap.values()].map((a) => {
          // For YTD, convert to cumulative
          const monthlyAmounts = a.amounts;
          const finalAmounts: bigint[] = mode === 'ytd'
            ? monthlyAmounts.reduce<bigint[]>((acc, v, i) => {
                acc.push((acc[i - 1] ?? 0n) + v);
                return acc;
              }, [])
            : [...monthlyAmounts];

          finalAmounts.forEach((v, i) => {
            if (a.type === 'revenue') {
              summaryRevenue[i] = (summaryRevenue[i] ?? 0n) + v;
            } else {
              summaryExpenses[i] = (summaryExpenses[i] ?? 0n) + v;
            }
          });

          const total = finalAmounts.reduce((s, v) => s + v, 0n);
          return {
            code: a.code,
            nameTh: a.nameTh,
            type: a.type,
            months: finalAmounts.map((v) => v.toString()),
            total: total.toString(),
          };
        });

        const summaryNet = summaryRevenue.map((r, i) => (r - (summaryExpenses[i] ?? 0n)).toString());

        return reply.status(200).send({
          mode,
          fiscalYear,
          generatedAt: new Date().toISOString(),
          accounts,
          summary: {
            totalRevenue: summaryRevenue.map((v) => v.toString()),
            totalExpenses: summaryExpenses.map((v) => v.toString()),
            netIncome: summaryNet,
          },
        });
      }

      // ------------------------------------------------------------------
      // mode=yoy — current year vs compare year (default: fiscalYear-1)
      // ------------------------------------------------------------------
      if (mode === 'yoy') {
        const prevYear = compareYear ?? fiscalYear - 1;

        const [currentRows, previousRows] = await Promise.all([
          queryPnlByPeriod(fastify, tenantId, fiscalYear),
          queryPnlByPeriod(fastify, tenantId, prevYear),
        ]);

        // Aggregate totals per account for each year (sum all periods)
        function aggregateByAccount(
          rows: PnlPeriodRow[],
        ): Map<string, { code: string; nameTh: string; type: string; total: bigint }> {
          const m = new Map<string, { code: string; nameTh: string; type: string; total: bigint }>();
          for (const row of rows) {
            let entry = m.get(row.account_id);
            if (entry === undefined) {
              entry = { code: row.code, nameTh: row.name_th, type: row.account_type, total: 0n };
              m.set(row.account_id, entry);
            }
            const debit = BigInt(row.total_debit);
            const credit = BigInt(row.total_credit);
            entry.total += pnlAmount(row.account_type, debit, credit);
          }
          return m;
        }

        const currentMap = aggregateByAccount(currentRows);
        const previousMap = aggregateByAccount(previousRows);

        // Union of all account IDs across both years
        const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()]);

        let currentRevenue = 0n;
        let previousRevenue = 0n;
        let currentExpenses = 0n;
        let previousExpenses = 0n;

        const accounts = [...allKeys].map((accountId) => {
          const cur = currentMap.get(accountId);
          const prev = previousMap.get(accountId);
          const meta = cur ?? prev!;
          const curTotal = cur?.total ?? 0n;
          const prevTotal = prev?.total ?? 0n;
          const changeSatang = curTotal - prevTotal;
          const changePercent = prevTotal === 0n
            ? null
            : Number((changeSatang * 10000n) / prevTotal) / 100;

          if (meta.type === 'revenue') {
            currentRevenue += curTotal;
            previousRevenue += prevTotal;
          } else {
            currentExpenses += curTotal;
            previousExpenses += prevTotal;
          }

          return {
            code: meta.code,
            nameTh: meta.nameTh,
            type: meta.type,
            current: curTotal.toString(),
            previous: prevTotal.toString(),
            changeSatang: changeSatang.toString(),
            changePercent,
          };
        });

        // Sort by code for consistent ordering
        accounts.sort((a, b) => a.code.localeCompare(b.code));

        return reply.status(200).send({
          mode: 'yoy',
          currentYear: fiscalYear,
          previousYear: prevYear,
          generatedAt: new Date().toISOString(),
          accounts,
          summary: {
            currentRevenue: currentRevenue.toString(),
            previousRevenue: previousRevenue.toString(),
            currentExpenses: currentExpenses.toString(),
            previousExpenses: previousExpenses.toString(),
            currentNet: (currentRevenue - currentExpenses).toString(),
            previousNet: (previousRevenue - previousExpenses).toString(),
          },
        });
      }

      // ------------------------------------------------------------------
      // mode=mom — this month vs previous month
      // ------------------------------------------------------------------
      if (mode === 'mom') {
        const currentPeriod = fiscalPeriod ?? new Date().getMonth() + 1;
        let prevPeriodYear = fiscalYear;
        let prevPeriod = currentPeriod - 1;
        if (prevPeriod < 1) {
          prevPeriod = 12;
          prevPeriodYear = fiscalYear - 1;
        }

        // Query both periods independently
        const [currentRows, previousRows] = await Promise.all([
          fastify.sql<PnlPeriodRow[]>`
            SELECT
              coa.id as account_id,
              coa.code,
              coa.name_th,
              coa.account_type,
              je.fiscal_period,
              COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
              COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
            FROM chart_of_accounts coa
            JOIN journal_entry_lines jel ON jel.account_id = coa.id
            JOIN journal_entries je ON je.id = jel.entry_id
              AND je.status = 'posted'
              AND je.fiscal_year = ${fiscalYear}
              AND je.fiscal_period = ${currentPeriod}
              AND je.tenant_id = ${tenantId}
            WHERE coa.tenant_id = ${tenantId}
              AND coa.account_type IN ('revenue', 'expense')
            GROUP BY coa.id, coa.code, coa.name_th, coa.account_type, je.fiscal_period
            ORDER BY coa.code
          `,
          fastify.sql<PnlPeriodRow[]>`
            SELECT
              coa.id as account_id,
              coa.code,
              coa.name_th,
              coa.account_type,
              je.fiscal_period,
              COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
              COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
            FROM chart_of_accounts coa
            JOIN journal_entry_lines jel ON jel.account_id = coa.id
            JOIN journal_entries je ON je.id = jel.entry_id
              AND je.status = 'posted'
              AND je.fiscal_year = ${prevPeriodYear}
              AND je.fiscal_period = ${prevPeriod}
              AND je.tenant_id = ${tenantId}
            WHERE coa.tenant_id = ${tenantId}
              AND coa.account_type IN ('revenue', 'expense')
            GROUP BY coa.id, coa.code, coa.name_th, coa.account_type, je.fiscal_period
            ORDER BY coa.code
          `,
        ]);

        const currentTotals = new Map<string, { code: string; nameTh: string; type: string; total: bigint }>();
        for (const row of currentRows) {
          const d = BigInt(row.total_debit);
          const c = BigInt(row.total_credit);
          currentTotals.set(row.account_id, {
            code: row.code,
            nameTh: row.name_th,
            type: row.account_type,
            total: pnlAmount(row.account_type, d, c),
          });
        }

        const previousTotals = new Map<string, { code: string; nameTh: string; type: string; total: bigint }>();
        for (const row of previousRows) {
          const d = BigInt(row.total_debit);
          const c = BigInt(row.total_credit);
          previousTotals.set(row.account_id, {
            code: row.code,
            nameTh: row.name_th,
            type: row.account_type,
            total: pnlAmount(row.account_type, d, c),
          });
        }

        const allKeys = new Set([...currentTotals.keys(), ...previousTotals.keys()]);

        let currentRevenue = 0n;
        let previousRevenue = 0n;
        let currentExpenses = 0n;
        let previousExpenses = 0n;

        const accounts = [...allKeys].map((accountId) => {
          const cur = currentTotals.get(accountId);
          const prev = previousTotals.get(accountId);
          const meta = cur ?? prev!;
          const curTotal = cur?.total ?? 0n;
          const prevTotal = prev?.total ?? 0n;
          const changeSatang = curTotal - prevTotal;
          const changePercent = prevTotal === 0n
            ? null
            : Number((changeSatang * 10000n) / prevTotal) / 100;

          if (meta.type === 'revenue') {
            currentRevenue += curTotal;
            previousRevenue += prevTotal;
          } else {
            currentExpenses += curTotal;
            previousExpenses += prevTotal;
          }

          return {
            code: meta.code,
            nameTh: meta.nameTh,
            type: meta.type,
            current: curTotal.toString(),
            previous: prevTotal.toString(),
            changeSatang: changeSatang.toString(),
            changePercent,
          };
        });

        accounts.sort((a, b) => a.code.localeCompare(b.code));

        return reply.status(200).send({
          mode: 'mom',
          currentPeriod: { year: fiscalYear, month: currentPeriod },
          previousPeriod: { year: prevPeriodYear, month: prevPeriod },
          generatedAt: new Date().toISOString(),
          accounts,
          summary: {
            currentRevenue: currentRevenue.toString(),
            previousRevenue: previousRevenue.toString(),
            currentExpenses: currentExpenses.toString(),
            previousExpenses: previousExpenses.toString(),
            currentNet: (currentRevenue - currentExpenses).toString(),
            previousNet: (previousRevenue - previousExpenses).toString(),
          },
        });
      }

      return reply.status(400).send({ error: `Unknown mode: ${mode as string}` });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/fixed-asset-register
  // -------------------------------------------------------------------------
  fastify.get(
    `${API_V1_PREFIX}/reports/fixed-asset-register`,
    {
      schema: {
        description: 'Fixed Asset Register Report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      const assets = await fastify.sql<Array<{
        id: string; asset_code: string; name_en: string; category: string;
        purchase_cost_satang: bigint; salvage_value_satang: bigint;
        accumulated_depreciation_satang: bigint; net_book_value_satang: bigint;
        status: string; purchase_date: string;
      }>>`
        SELECT id, asset_code, name_en, category, purchase_cost_satang,
               salvage_value_satang, accumulated_depreciation_satang,
               net_book_value_satang, status, purchase_date
        FROM fixed_assets
        WHERE tenant_id = ${tenantId}
        ORDER BY asset_code
      `;

      const items = assets.map((a) => ({
        id: a.id,
        assetCode: a.asset_code,
        nameEn: a.name_en,
        category: a.category,
        purchaseCostSatang: a.purchase_cost_satang.toString(),
        salvageValueSatang: a.salvage_value_satang.toString(),
        accumulatedDepreciationSatang: a.accumulated_depreciation_satang.toString(),
        netBookValueSatang: a.net_book_value_satang.toString(),
        status: a.status,
        purchaseDate: a.purchase_date,
      }));

      return reply.status(200).send({
        reportName: 'Fixed Asset Register',
        generatedAt: new Date().toISOString(),
        items,
        total: items.length,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/low-stock
  // -------------------------------------------------------------------------
  fastify.get(
    `${API_V1_PREFIX}/reports/low-stock`,
    {
      schema: {
        description: 'Low Stock Alert Report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      const lowStockItems = await fastify.sql<Array<{
        id: string; sku: string; name_th: string; name_en: string;
        min_stock_qty: number; total_qty: number;
      }>>`
        SELECT p.id, p.sku, p.name_th, p.name_en, p.min_stock_qty,
               COALESCE(SUM(si.quantity), 0)::int as total_qty
        FROM products p
        LEFT JOIN stock_items si ON si.product_id = p.id
        WHERE p.tenant_id = ${tenantId}
        GROUP BY p.id, p.sku, p.name_th, p.name_en, p.min_stock_qty
        HAVING COALESCE(SUM(si.quantity), 0) < p.min_stock_qty
        ORDER BY p.sku
      `.catch(() => [] as Array<{ id: string; sku: string; name_th: string; name_en: string; min_stock_qty: number; total_qty: number }>);

      const items = lowStockItems.map((i) => ({
        id: i.id,
        sku: i.sku,
        nameTh: i.name_th,
        nameEn: i.name_en,
        minStockQty: i.min_stock_qty,
        currentQty: i.total_qty,
        shortfall: i.min_stock_qty - i.total_qty,
      }));

      return reply.status(200).send({
        reportName: 'Low Stock Alert',
        generatedAt: new Date().toISOString(),
        items,
        total: items.length,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/stock-valuation
  // -------------------------------------------------------------------------
  fastify.get(
    `${API_V1_PREFIX}/reports/stock-valuation`,
    {
      schema: {
        description: 'Stock Valuation Report (average cost)',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      const stockItems = await fastify.sql<Array<{
        warehouse_id: string; warehouse_name: string;
        product_id: string; sku: string; name_en: string;
        quantity: number; unit_cost_satang: bigint; total_value_satang: bigint;
      }>>`
        SELECT w.id as warehouse_id, w.name as warehouse_name,
               p.id as product_id, p.sku, p.name_en,
               COALESCE(si.quantity, 0) as quantity,
               p.cost_satang as unit_cost_satang,
               (COALESCE(si.quantity, 0) * p.cost_satang)::bigint as total_value_satang
        FROM warehouses w
        CROSS JOIN products p
        LEFT JOIN stock_items si ON si.warehouse_id = w.id AND si.product_id = p.id
        WHERE w.tenant_id = ${tenantId} AND p.tenant_id = ${tenantId}
        ORDER BY w.name, p.sku
      `.catch(() => [] as Array<{ warehouse_id: string; warehouse_name: string; product_id: string; sku: string; name_en: string; quantity: number; unit_cost_satang: bigint; total_value_satang: bigint }>);

      const totalValueSatang = stockItems.reduce((sum, i) => sum + BigInt(i.total_value_satang ?? 0), 0n);

      const items = stockItems.map((i) => ({
        warehouseId: i.warehouse_id,
        warehouseName: i.warehouse_name,
        productId: i.product_id,
        sku: i.sku,
        nameEn: i.name_en,
        quantity: i.quantity,
        unitCostSatang: i.unit_cost_satang?.toString() ?? '0',
        totalValueSatang: i.total_value_satang?.toString() ?? '0',
      }));

      return reply.status(200).send({
        reportName: 'Stock Valuation',
        generatedAt: new Date().toISOString(),
        items,
        totalValueSatang: totalValueSatang.toString(),
        currency: 'THB',
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/wht-summary
  // -------------------------------------------------------------------------
  fastify.get(
    `${API_V1_PREFIX}/reports/wht-summary`,
    {
      schema: {
        description: 'WHT Certificate Summary Report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            month: { type: 'integer', minimum: 1, maximum: 12 },
            year: { type: 'integer' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_AP_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { month, year } = request.query as { month?: number; year?: number };
      const targetYear = year ?? new Date().getFullYear();
      const targetMonth = month ?? new Date().getMonth() + 1;

      const certs = await fastify.sql<Array<{
        id: string; certificate_number: string; certificate_type: string;
        payee_name: string; income_type: string; gross_income_satang: bigint;
        wht_amount_satang: bigint; status: string; payment_date: string;
      }>>`
        SELECT id, certificate_number, certificate_type, payee_name,
               income_type, gross_income_satang, wht_amount_satang,
               status, payment_date
        FROM wht_certificates
        WHERE tenant_id = ${tenantId}
          AND EXTRACT(YEAR FROM payment_date::date) = ${targetYear}
          AND EXTRACT(MONTH FROM payment_date::date) = ${targetMonth}
          AND status != 'voided'
        ORDER BY payment_date
      `.catch(() => [] as Array<{ id: string; certificate_number: string; certificate_type: string; payee_name: string; income_type: string; gross_income_satang: bigint; wht_amount_satang: bigint; status: string; payment_date: string }>);

      const totalWhtSatang = certs.reduce((sum, c) => sum + BigInt(c.wht_amount_satang ?? 0), 0n);
      const totalGrossSatang = certs.reduce((sum, c) => sum + BigInt(c.gross_income_satang ?? 0), 0n);

      const items = certs.map((c) => ({
        id: c.id,
        certificateNumber: c.certificate_number,
        certificateType: c.certificate_type,
        payeeName: c.payee_name,
        incomeType: c.income_type,
        grossIncomeSatang: c.gross_income_satang?.toString() ?? '0',
        whtAmountSatang: c.wht_amount_satang?.toString() ?? '0',
        status: c.status,
        paymentDate: c.payment_date,
      }));

      return reply.status(200).send({
        reportName: 'WHT Summary',
        year: targetYear,
        month: targetMonth,
        generatedAt: new Date().toISOString(),
        items,
        totalGrossIncomeSatang: totalGrossSatang.toString(),
        totalWhtAmountSatang: totalWhtSatang.toString(),
        currency: 'THB',
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/vat-return — ภ.พ.30 VAT Return Report
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: { year?: number; month?: number } }>(
    `${API_V1_PREFIX}/reports/vat-return`,
    {
      schema: {
        description: 'ภ.พ.30 VAT Return Report — output VAT (posted invoices) minus input VAT (posted bills) for a period',
        tags: ['reports', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            year: { type: 'integer', description: 'Tax year (defaults to current year)' },
            month: { type: 'integer', minimum: 1, maximum: 12, description: 'Tax month (defaults to current month)' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              reportName: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              taxYear: { type: 'integer' },
              taxMonth: { type: 'integer' },
              outputVat: moneySchema,
              outputVatTransactionCount: { type: 'integer' },
              inputVat: moneySchema,
              inputVatTransactionCount: { type: 'integer' },
              netVat: moneySchema,
              status: { type: 'string', enum: ['payable', 'refundable', 'zero'] },
              currency: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_VAT_RETURN_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const now = new Date();
      const year = request.query.year ?? now.getFullYear();
      const month = request.query.month ?? (now.getMonth() + 1);

      // Output VAT: 7% on posted invoice subtotals for the period
      const outputRows = await fastify.sql<[{ invoice_count: string; total_subtotal_satang: string | null }]>`
        SELECT
          COUNT(*)::text as invoice_count,
          COALESCE(SUM(total_satang), 0)::text as total_subtotal_satang
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND status IN ('posted', 'sent', 'paid', 'partial')
          AND EXTRACT(YEAR FROM posted_at) = ${year}
          AND EXTRACT(MONTH FROM posted_at) = ${month}
      `;

      // Input VAT: 7% on posted bill totals for the period
      const inputRows = await fastify.sql<[{ bill_count: string; total_subtotal_satang: string | null }]>`
        SELECT
          COUNT(*)::text as bill_count,
          COALESCE(SUM(total_satang), 0)::text as total_subtotal_satang
        FROM bills
        WHERE tenant_id = ${tenantId}
          AND status IN ('posted', 'paid', 'partial')
          AND EXTRACT(YEAR FROM posted_at) = ${year}
          AND EXTRACT(MONTH FROM posted_at) = ${month}
      `;

      const VAT_BP = 700n; // 7% in basis points

      const outputSubtotal = BigInt(outputRows[0].total_subtotal_satang ?? '0');
      const outputVatAmount = (outputSubtotal * VAT_BP + 5000n) / 10000n; // round half-up
      const outputCount = parseInt(outputRows[0].invoice_count, 10);

      const inputSubtotal = BigInt(inputRows[0].total_subtotal_satang ?? '0');
      const inputVatAmount = (inputSubtotal * VAT_BP + 5000n) / 10000n;
      const inputCount = parseInt(inputRows[0].bill_count, 10);

      const netVatAmount = outputVatAmount - inputVatAmount;
      const status = netVatAmount > 0n ? 'payable' : netVatAmount < 0n ? 'refundable' : 'zero';

      return reply.status(200).send({
        reportName: 'ภ.พ.30 VAT Return',
        generatedAt: new Date().toISOString(),
        taxYear: year,
        taxMonth: month,
        outputVat: money(outputVatAmount),
        outputVatTransactionCount: outputCount,
        inputVat: money(inputVatAmount),
        inputVatTransactionCount: inputCount,
        netVat: money(netVatAmount < 0n ? (-netVatAmount).toString() : netVatAmount.toString()),
        status,
        currency: 'THB',
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/reports/ssc-filing — SSC Monthly Filing Report (สปส.)
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: { year?: number; month?: number } }>(
    `${API_V1_PREFIX}/reports/ssc-filing`,
    {
      schema: {
        description: 'SSC Monthly Filing Report (สปส.) — per-employee SSC breakdown for monthly filing',
        tags: ['reports', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            year: { type: 'integer', description: 'Filing year (defaults to current year)' },
            month: { type: 'integer', minimum: 1, maximum: 12, description: 'Filing month (defaults to current month)' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              reportName: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              filingYear: { type: 'integer' },
              filingMonth: { type: 'integer' },
              employees: { type: 'array', items: { type: 'object' } },
              totalEmployeeSSCSatang: { type: 'string' },
              totalEmployerSSCSatang: { type: 'string' },
              grandTotalSSCSatang: { type: 'string' },
              employeeCount: { type: 'integer' },
              currency: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_SSC_FILING_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const now = new Date();
      const year = request.query.year ?? now.getFullYear();
      const month = request.query.month ?? (now.getMonth() + 1);

      interface SSCRow {
        employee_id: string;
        employee_code: string;
        first_name_th: string;
        last_name_th: string;
        national_id: string | null;
        social_security_number: string | null;
        gross_satang: number;
        social_security_satang: number;
        employer_ssc_satang: number;
      }

      // Find payroll runs for the given month/year, join items with employee info
      const rows = await fastify.sql<SSCRow[]>`
        SELECT
          pi.employee_id,
          e.employee_code,
          e.first_name_th,
          e.last_name_th,
          e.national_id,
          e.social_security_number,
          pi.gross_satang,
          pi.social_security_satang,
          pi.employer_ssc_satang
        FROM payroll_items pi
        JOIN payroll_runs pr ON pr.id = pi.payroll_run_id
        JOIN employees e ON e.id = pi.employee_id
        WHERE pr.tenant_id = ${tenantId}
          AND pr.status IN ('calculated', 'approved', 'paid')
          AND EXTRACT(YEAR FROM pr.pay_period_start::date) = ${year}
          AND EXTRACT(MONTH FROM pr.pay_period_start::date) = ${month}
        ORDER BY e.employee_code
      `;

      let totalEmployeeSSC = 0;
      let totalEmployerSSC = 0;

      const employees = rows.map((r) => {
        totalEmployeeSSC += r.social_security_satang;
        totalEmployerSSC += r.employer_ssc_satang;
        return {
          employeeId: r.employee_id,
          employeeCode: r.employee_code,
          nameTh: `${r.first_name_th} ${r.last_name_th}`,
          nationalId: r.national_id,
          socialSecurityNumber: r.social_security_number,
          grossSatang: r.gross_satang.toString(),
          employeeSSCSatang: r.social_security_satang.toString(),
          employerSSCSatang: r.employer_ssc_satang.toString(),
        };
      });

      return reply.status(200).send({
        reportName: 'SSC Monthly Filing (สปส.)',
        generatedAt: new Date().toISOString(),
        filingYear: year,
        filingMonth: month,
        employees,
        totalEmployeeSSCSatang: totalEmployeeSSC.toString(),
        totalEmployerSSCSatang: totalEmployerSSC.toString(),
        grandTotalSSCSatang: (totalEmployeeSSC + totalEmployerSSC).toString(),
        employeeCount: employees.length,
        currency: 'THB',
      });
    },
  );
}
