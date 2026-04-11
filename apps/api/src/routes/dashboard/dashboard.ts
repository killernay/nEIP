/**
 * Dashboard routes:
 *   GET /api/v1/dashboard/executive    — Executive dashboard metrics
 *   GET /api/v1/dashboard/consolidated — Cross-org consolidated view
 *
 * Stories 14.2, 14.3 — Executive Dashboard & Consolidated Overview
 *
 * All monetary values use satang strings for bigint safety.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { REPORT_GL_READ } from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TimePeriod = 'mtd' | 'qtd' | 'ytd' | 'custom';

interface ExecutiveQuery {
  period?: TimePeriod;
  startDate?: string;
  endDate?: string;
}

interface MonthlyRevenueRow {
  month: string;
  total_revenue: string;
}

interface ExpenseCategoryRow {
  account_type: string;
  code: string;
  name_en: string;
  total_amount: string;
}

interface AccountBalanceRow {
  account_type: string;
  total_debit: string;
  total_credit: string;
}

interface BudgetUtilRow {
  code: string;
  name_en: string;
  budget_amount: string;
  actual_amount: string;
}

interface ConsolidatedOrgRow {
  tenant_id: string;
  tenant_name: string;
  total_revenue: string;
  total_expenses: string;
  outstanding_ar: string;
  outstanding_ap: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function money(amountSatang: bigint | string, currency = 'THB') {
  return {
    amountSatang: amountSatang.toString(),
    currency,
  };
}

function getDateRange(period: TimePeriod, startDate?: string, endDate?: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  switch (period) {
    case 'mtd':
      return {
        start: `${String(year)}-${String(month + 1).padStart(2, '0')}-01`,
        end: now.toISOString().slice(0, 10),
      };
    case 'qtd': {
      const quarterStart = Math.floor(month / 3) * 3;
      return {
        start: `${String(year)}-${String(quarterStart + 1).padStart(2, '0')}-01`,
        end: now.toISOString().slice(0, 10),
      };
    }
    case 'ytd':
      return {
        start: `${String(year)}-01-01`,
        end: now.toISOString().slice(0, 10),
      };
    case 'custom':
      return {
        start: startDate ?? `${String(year)}-01-01`,
        end: endDate ?? now.toISOString().slice(0, 10),
      };
    default:
      return {
        start: `${String(year)}-${String(month + 1).padStart(2, '0')}-01`,
        end: now.toISOString().slice(0, 10),
      };
  }
}

const moneySchema = {
  type: 'object',
  properties: {
    amountSatang: { type: 'string' },
    currency: { type: 'string', default: 'THB' },
  },
} as const;

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function dashboardRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /api/v1/dashboard/executive
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: ExecutiveQuery }>(
    `${API_V1_PREFIX}/dashboard/executive`,
    {
      schema: {
        description: 'Get executive dashboard metrics',
        tags: ['dashboard'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['mtd', 'qtd', 'ytd', 'custom'], default: 'mtd' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              generatedAt: { type: 'string', format: 'date-time' },
              revenueTrend: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    month: { type: 'string' },
                    revenue: moneySchema,
                  },
                },
              },
              totalRevenue: moneySchema,
              expenseBreakdown: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                    amount: moneySchema,
                  },
                },
              },
              totalExpenses: moneySchema,
              cashFlow: {
                type: 'object',
                properties: {
                  inflow: moneySchema,
                  outflow: moneySchema,
                  net: moneySchema,
                },
              },
              arAging: {
                type: 'object',
                properties: {
                  current: moneySchema,
                  days1to30: moneySchema,
                  days31to60: moneySchema,
                  days61to90: moneySchema,
                  over90: moneySchema,
                  total: moneySchema,
                },
              },
              budgetUtilization: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                    budget: moneySchema,
                    actual: moneySchema,
                    percentage: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const period = request.query.period ?? 'mtd';
      const { start, end } = getDateRange(
        period as TimePeriod,
        request.query.startDate,
        request.query.endDate,
      );

      const fiscalYear = new Date().getFullYear();

      // 1. Revenue trend (last 6 months)
      const revenueTrendRows = await fastify.sql<MonthlyRevenueRow[]>`
        SELECT
          to_char(je.posted_at, 'YYYY-MM') as month,
          COALESCE(SUM(jel.credit_satang) - SUM(jel.debit_satang), 0)::text as total_revenue
        FROM journal_entries je
        JOIN journal_entry_lines jel ON jel.entry_id = je.id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND coa.account_type = 'revenue'
          AND je.posted_at >= (CURRENT_DATE - INTERVAL '6 months')
          AND je.posted_at <= CURRENT_DATE
        GROUP BY to_char(je.posted_at, 'YYYY-MM')
        ORDER BY month
      `;

      // 2. Expense breakdown by account
      const expenseRows = await fastify.sql<ExpenseCategoryRow[]>`
        SELECT
          coa.account_type, coa.code, coa.name_en,
          COALESCE(SUM(jel.debit_satang) - SUM(jel.credit_satang), 0)::text as total_amount
        FROM journal_entries je
        JOIN journal_entry_lines jel ON jel.entry_id = je.id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND coa.account_type = 'expense'
          AND je.posted_at >= ${start}::date
          AND je.posted_at <= ${end}::date
        GROUP BY coa.account_type, coa.code, coa.name_en
        ORDER BY total_amount DESC
      `;

      // 3. Revenue + Expense totals for cash flow
      const balanceRows = await fastify.sql<AccountBalanceRow[]>`
        SELECT
          coa.account_type,
          COALESCE(SUM(jel.debit_satang), 0)::text as total_debit,
          COALESCE(SUM(jel.credit_satang), 0)::text as total_credit
        FROM journal_entries je
        JOIN journal_entry_lines jel ON jel.entry_id = je.id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND coa.account_type IN ('revenue', 'expense')
          AND je.posted_at >= ${start}::date
          AND je.posted_at <= ${end}::date
        GROUP BY coa.account_type
      `;

      let totalRevenue = 0n;
      let totalExpenses = 0n;

      for (const row of balanceRows) {
        const debit = BigInt(row.total_debit);
        const credit = BigInt(row.total_credit);
        if (row.account_type === 'revenue') {
          totalRevenue = credit - debit;
        } else if (row.account_type === 'expense') {
          totalExpenses = debit - credit;
        }
      }

      // 4. Budget utilization
      const budgetRows = await fastify.sql<BudgetUtilRow[]>`
        SELECT
          coa.code, coa.name_en,
          COALESCE(b.amount_satang, 0)::text as budget_amount,
          COALESCE(SUM(jel.debit_satang) - SUM(jel.credit_satang), 0)::text as actual_amount
        FROM budgets b
        JOIN chart_of_accounts coa ON coa.id = b.account_id
        LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
        LEFT JOIN journal_entries je ON je.id = jel.entry_id
          AND je.status = 'posted'
          AND je.fiscal_year = ${fiscalYear}
          AND je.tenant_id = ${tenantId}
        WHERE b.tenant_id = ${tenantId} AND b.fiscal_year = ${fiscalYear}
        GROUP BY coa.code, coa.name_en, b.amount_satang
        ORDER BY coa.code
      `;

      // 5. AR Aging — real invoice data
      interface AgingInvoiceRow {
        total_satang: string; paid_satang: string; due_date: string;
      }
      const agingInvoices = await fastify.sql<AgingInvoiceRow[]>`
        SELECT total_satang::text, paid_satang::text, due_date
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND status IN ('posted', 'sent', 'partial', 'overdue')
      `;

      let arCurrent = 0n, ar1to30 = 0n, ar31to60 = 0n, ar61to90 = 0n, arOver90 = 0n;
      const todayDate = new Date();
      for (const inv of agingInvoices) {
        const outstanding = BigInt(inv.total_satang) - BigInt(inv.paid_satang);
        if (outstanding <= 0n) continue;
        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.max(0, Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (daysOverdue === 0) { arCurrent += outstanding; }
        else if (daysOverdue <= 30) { ar1to30 += outstanding; }
        else if (daysOverdue <= 60) { ar31to60 += outstanding; }
        else if (daysOverdue <= 90) { ar61to90 += outstanding; }
        else { arOver90 += outstanding; }
      }
      const arTotal = arCurrent + ar1to30 + ar31to60 + ar61to90 + arOver90;

      const arAging = {
        current: money(arCurrent),
        days1to30: money(ar1to30),
        days31to60: money(ar31to60),
        days61to90: money(ar61to90),
        over90: money(arOver90),
        total: money(arTotal),
      };

      return reply.status(200).send({
        period,
        startDate: start,
        endDate: end,
        generatedAt: new Date().toISOString(),
        revenueTrend: revenueTrendRows.map((r) => ({
          month: r.month,
          revenue: money(r.total_revenue),
        })),
        totalRevenue: money(totalRevenue),
        expenseBreakdown: expenseRows.map((r) => ({
          code: r.code,
          name: r.name_en,
          amount: money(r.total_amount),
        })),
        totalExpenses: money(totalExpenses),
        cashFlow: {
          inflow: money(totalRevenue),
          outflow: money(totalExpenses),
          net: money(totalRevenue - totalExpenses),
        },
        arAging,
        budgetUtilization: budgetRows.map((r) => {
          const budget = BigInt(r.budget_amount);
          const actual = BigInt(r.actual_amount);
          const percentage = budget === 0n ? 0 : Number((actual * 10000n) / budget) / 100;
          return {
            code: r.code,
            name: r.name_en,
            budget: money(budget),
            actual: money(actual),
            percentage,
          };
        }),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/dashboard/consolidated
  // -------------------------------------------------------------------------
  fastify.get(
    `${API_V1_PREFIX}/dashboard/consolidated`,
    {
      schema: {
        description: 'Get consolidated cross-organization overview',
        tags: ['dashboard'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              generatedAt: { type: 'string', format: 'date-time' },
              organizations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    tenantId: { type: 'string' },
                    tenantName: { type: 'string' },
                    revenueMtd: moneySchema,
                    expensesMtd: moneySchema,
                    netIncome: moneySchema,
                    outstandingAr: moneySchema,
                    outstandingAp: moneySchema,
                  },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const userId = request.user.sub;

      // Get all tenants the user belongs to
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const mtdStart = `${String(year)}-${String(month).padStart(2, '0')}-01`;
      const mtdEnd = now.toISOString().slice(0, 10);

      // Query cross-org metrics using user_roles to find tenant memberships
      const orgRows = await fastify.sql<ConsolidatedOrgRow[]>`
        WITH user_tenants AS (
          SELECT DISTINCT t.id as tenant_id, t.name as tenant_name
          FROM tenants t
          JOIN users u ON u.tenant_id = t.id
          WHERE u.id = ${userId}
        ),
        revenue_data AS (
          SELECT
            je.tenant_id,
            COALESCE(SUM(jel.credit_satang) - SUM(jel.debit_satang), 0)::text as total_revenue
          FROM user_tenants ut
          JOIN journal_entries je ON je.tenant_id = ut.tenant_id
          JOIN journal_entry_lines jel ON jel.entry_id = je.id
          JOIN chart_of_accounts coa ON coa.id = jel.account_id
          WHERE je.status = 'posted'
            AND coa.account_type = 'revenue'
            AND je.posted_at >= ${mtdStart}::date
            AND je.posted_at <= ${mtdEnd}::date
          GROUP BY je.tenant_id
        ),
        expense_data AS (
          SELECT
            je.tenant_id,
            COALESCE(SUM(jel.debit_satang) - SUM(jel.credit_satang), 0)::text as total_expenses
          FROM user_tenants ut
          JOIN journal_entries je ON je.tenant_id = ut.tenant_id
          JOIN journal_entry_lines jel ON jel.entry_id = je.id
          JOIN chart_of_accounts coa ON coa.id = jel.account_id
          WHERE je.status = 'posted'
            AND coa.account_type = 'expense'
            AND je.posted_at >= ${mtdStart}::date
            AND je.posted_at <= ${mtdEnd}::date
          GROUP BY je.tenant_id
        )
        SELECT
          ut.tenant_id,
          ut.tenant_name,
          COALESCE(rd.total_revenue, '0') as total_revenue,
          COALESCE(ed.total_expenses, '0') as total_expenses,
          '0' as outstanding_ar,
          '0' as outstanding_ap
        FROM user_tenants ut
        LEFT JOIN revenue_data rd ON rd.tenant_id = ut.tenant_id
        LEFT JOIN expense_data ed ON ed.tenant_id = ut.tenant_id
        ORDER BY ut.tenant_name
      `;

      return reply.status(200).send({
        generatedAt: new Date().toISOString(),
        organizations: orgRows.map((row) => {
          const revenue = BigInt(row.total_revenue);
          const expenses = BigInt(row.total_expenses);
          return {
            tenantId: row.tenant_id,
            tenantName: row.tenant_name,
            revenueMtd: money(revenue),
            expensesMtd: money(expenses),
            netIncome: money(revenue - expenses),
            outstandingAr: money(row.outstanding_ar),
            outstandingAp: money(row.outstanding_ap),
          };
        }),
      });
    },
  );
}
