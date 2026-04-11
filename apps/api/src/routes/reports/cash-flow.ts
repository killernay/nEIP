/**
 * Cash Flow Statement route (Phase 5.7):
 *   GET /api/v1/reports/cash-flow?year=YYYY&period=MM
 *
 * Indirect method: start from net income, adjust for non-cash items.
 * Classify GL movements: operating, investing, financing.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { REPORT_GL_READ } from '../../lib/permissions.js';

interface AccountMovement {
  account_id: string;
  code: string;
  name_en: string;
  account_type: string;
  total_debit: string;
  total_credit: string;
}

/**
 * Classify account into cash flow categories based on account type and code patterns.
 * Operating: revenue, expense, cost_of_goods_sold
 * Investing: asset accounts with codes 1500-1999 (fixed assets, investments)
 * Financing: equity, long-term liability (codes 2200+, 3xxx)
 */
function classifyAccount(accountType: string, code: string): 'operating' | 'investing' | 'financing' | 'cash' {
  // Cash accounts — excluded from classification (used for opening/closing)
  if (code.startsWith('100') || code.startsWith('101') || code.startsWith('110')) {
    return 'cash';
  }

  // Investing: fixed assets, investments (1500-1999)
  const codeNum = parseInt(code.slice(0, 4), 10);
  if (accountType === 'asset' && codeNum >= 1500 && codeNum <= 1999) {
    return 'investing';
  }

  // Financing: equity (3xxx), long-term liabilities (2200+)
  if (accountType === 'equity') return 'financing';
  if (accountType === 'liability' && codeNum >= 2200) return 'financing';

  // Operating: everything else (revenue, expense, current assets/liabilities)
  return 'operating';
}

export async function cashFlowRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  fastify.get<{ Querystring: { year: number; period?: number } }>(
    `${API_V1_PREFIX}/reports/cash-flow`,
    {
      schema: {
        description: 'Cash Flow Statement (indirect method)',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['year'],
          properties: {
            year: { type: 'integer' },
            period: { type: 'integer', minimum: 1, maximum: 12 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { year, period } = request.query;

      // Get all posted JE line movements for the period, joined with CoA
      let movements: AccountMovement[];
      if (period) {
        movements = await fastify.sql<AccountMovement[]>`
          SELECT jel.account_id, coa.code, coa.name_en, coa.account_type,
            COALESCE(SUM(jel.debit_satang), 0)::text AS total_debit,
            COALESCE(SUM(jel.credit_satang), 0)::text AS total_credit
          FROM journal_entry_lines jel
          JOIN journal_entries je ON je.id = jel.entry_id
          JOIN chart_of_accounts coa ON coa.id = jel.account_id
          WHERE je.tenant_id = ${tenantId}
            AND je.status = 'posted'
            AND je.fiscal_year = ${year}
            AND je.fiscal_period = ${period}
          GROUP BY jel.account_id, coa.code, coa.name_en, coa.account_type
        `;
      } else {
        movements = await fastify.sql<AccountMovement[]>`
          SELECT jel.account_id, coa.code, coa.name_en, coa.account_type,
            COALESCE(SUM(jel.debit_satang), 0)::text AS total_debit,
            COALESCE(SUM(jel.credit_satang), 0)::text AS total_credit
          FROM journal_entry_lines jel
          JOIN journal_entries je ON je.id = jel.entry_id
          JOIN chart_of_accounts coa ON coa.id = jel.account_id
          WHERE je.tenant_id = ${tenantId}
            AND je.status = 'posted'
            AND je.fiscal_year = ${year}
          GROUP BY jel.account_id, coa.code, coa.name_en, coa.account_type
        `;
      }

      // Calculate net income (revenue credits - expense debits)
      let netIncomeSatang = 0n;
      let operatingTotal = 0n;
      let investingTotal = 0n;
      let financingTotal = 0n;
      let cashMovement = 0n;

      const operatingItems: Array<{ code: string; name: string; amountSatang: string }> = [];
      const investingItems: Array<{ code: string; name: string; amountSatang: string }> = [];
      const financingItems: Array<{ code: string; name: string; amountSatang: string }> = [];

      for (const m of movements) {
        const debit = BigInt(m.total_debit);
        const credit = BigInt(m.total_credit);
        const netFlow = credit - debit; // positive = cash inflow for revenue/liability; negative = outflow for assets/expenses

        const category = classifyAccount(m.account_type, m.code);

        // Net income from revenue/expense
        if (m.account_type === 'revenue') {
          netIncomeSatang += netFlow;
        } else if (m.account_type === 'expense' || m.account_type === 'cost_of_goods_sold') {
          netIncomeSatang += netFlow;
        }

        if (category === 'cash') {
          cashMovement += netFlow;
        } else if (category === 'operating') {
          operatingTotal += netFlow;
          operatingItems.push({ code: m.code, name: m.name_en, amountSatang: netFlow.toString() });
        } else if (category === 'investing') {
          investingTotal += netFlow;
          investingItems.push({ code: m.code, name: m.name_en, amountSatang: netFlow.toString() });
        } else if (category === 'financing') {
          financingTotal += netFlow;
          financingItems.push({ code: m.code, name: m.name_en, amountSatang: netFlow.toString() });
        }
      }

      const netChange = operatingTotal + investingTotal + financingTotal;

      // Get opening cash balance (sum of cash account balances at start of period)
      const openingCashRows = await fastify.sql<[{ balance: string }?]>`
        SELECT COALESCE(SUM(jel.credit_satang - jel.debit_satang), 0)::text AS balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.entry_id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND (je.fiscal_year < ${year} OR (je.fiscal_year = ${year} AND je.fiscal_period < ${period ?? 1}))
          AND (coa.code LIKE '100%' OR coa.code LIKE '101%' OR coa.code LIKE '110%')
      `;

      const openingCash = BigInt(openingCashRows[0]?.balance ?? '0');
      const closingCash = openingCash + netChange;

      return reply.send({
        year,
        period: period ?? null,
        netIncomeSatang: netIncomeSatang.toString(),
        operating: {
          total: operatingTotal.toString(),
          items: operatingItems,
        },
        investing: {
          total: investingTotal.toString(),
          items: investingItems,
        },
        financing: {
          total: financingTotal.toString(),
          items: financingItems,
        },
        netChange: netChange.toString(),
        openingCash: openingCash.toString(),
        closingCash: closingCash.toString(),
      });
    },
  );
}
