/**
 * Dashboard drill-down and role-based view routes:
 *   GET /api/v1/dashboard/executive?role=cfo|accountant|sales|hr
 *   GET /api/v1/dashboard/revenue-detail   — Revenue drill-down
 *   GET /api/v1/dashboard/expense-detail   — Expense drill-down
 *   GET /api/v1/dashboard/config           — Role-based widget config
 *
 * Story 6.7 — Dashboard Drill-Down + Role-Based Views
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { REPORT_GL_READ } from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrillDownQuery {
  startDate?: string;
  endDate?: string;
  account?: string;
  limit?: number;
}

interface ConfigQuery {
  role?: string;
}

function money(amountSatang: bigint | string, currency = 'THB') {
  return {
    amountSatang: amountSatang.toString(),
    currency,
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function dashboardDrilldownRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // -------------------------------------------------------------------------
  // GET /api/v1/dashboard/revenue-detail
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: DrillDownQuery }>(
    `${API_V1_PREFIX}/dashboard/revenue-detail`,
    {
      schema: {
        description: 'Revenue drill-down — transaction-level detail',
        tags: ['dashboard'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            account: { type: 'string' },
            limit: { type: 'integer', default: 100, maximum: 1000 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const now = new Date();
      const start = request.query.startDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const end = request.query.endDate ?? now.toISOString().slice(0, 10);
      const maxRows = request.query.limit ?? 100;

      interface RevenueDetailRow {
        entry_id: string;
        entry_number: string;
        entry_date: string;
        account_code: string;
        account_name: string;
        description: string | null;
        credit_satang: string;
        debit_satang: string;
      }

      const rows = await fastify.sql<RevenueDetailRow[]>`
        SELECT
          je.id as entry_id, je.entry_number, je.entry_date::text,
          coa.code as account_code, coa.name_en as account_name,
          je.description,
          jel.credit_satang::text, jel.debit_satang::text
        FROM journal_entries je
        JOIN journal_entry_lines jel ON jel.entry_id = je.id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND coa.account_type = 'revenue'
          AND je.entry_date >= ${start}::date
          AND je.entry_date <= ${end}::date
        ORDER BY je.entry_date DESC, je.entry_number
        LIMIT ${maxRows}
      `;

      return reply.status(200).send({
        startDate: start,
        endDate: end,
        rowCount: rows.length,
        transactions: rows.map(r => ({
          entryId: r.entry_id,
          entryNumber: r.entry_number,
          date: r.entry_date,
          accountCode: r.account_code,
          accountName: r.account_name,
          description: r.description,
          amount: money(BigInt(r.credit_satang) - BigInt(r.debit_satang)),
        })),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/dashboard/expense-detail
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: DrillDownQuery }>(
    `${API_V1_PREFIX}/dashboard/expense-detail`,
    {
      schema: {
        description: 'Expense drill-down — transaction-level detail',
        tags: ['dashboard'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            account: { type: 'string' },
            limit: { type: 'integer', default: 100, maximum: 1000 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const now = new Date();
      const start = request.query.startDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const end = request.query.endDate ?? now.toISOString().slice(0, 10);
      const maxRows = request.query.limit ?? 100;

      interface ExpenseDetailRow {
        entry_id: string;
        entry_number: string;
        entry_date: string;
        account_code: string;
        account_name: string;
        description: string | null;
        debit_satang: string;
        credit_satang: string;
      }

      const rows = await fastify.sql<ExpenseDetailRow[]>`
        SELECT
          je.id as entry_id, je.entry_number, je.entry_date::text,
          coa.code as account_code, coa.name_en as account_name,
          je.description,
          jel.debit_satang::text, jel.credit_satang::text
        FROM journal_entries je
        JOIN journal_entry_lines jel ON jel.entry_id = je.id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND coa.account_type = 'expense'
          AND je.entry_date >= ${start}::date
          AND je.entry_date <= ${end}::date
        ORDER BY je.entry_date DESC, je.entry_number
        LIMIT ${maxRows}
      `;

      return reply.status(200).send({
        startDate: start,
        endDate: end,
        rowCount: rows.length,
        transactions: rows.map(r => ({
          entryId: r.entry_id,
          entryNumber: r.entry_number,
          date: r.entry_date,
          accountCode: r.account_code,
          accountName: r.account_name,
          description: r.description,
          amount: money(BigInt(r.debit_satang) - BigInt(r.credit_satang)),
        })),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/dashboard/config?role=cfo
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: ConfigQuery }>(
    `${API_V1_PREFIX}/dashboard/config`,
    {
      schema: {
        description: 'Get role-based dashboard widget configuration',
        tags: ['dashboard'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['cfo', 'accountant', 'sales', 'hr'] },
          },
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const role = request.query.role ?? 'accountant';

      interface ConfigRow {
        role: string;
        widgets: string;
      }

      const rows = await fastify.sql<ConfigRow[]>`
        SELECT role, widgets::text
        FROM dashboard_configs
        WHERE tenant_id = ${tenantId} AND role = ${role}
        LIMIT 1
      `;

      if (rows.length === 0) {
        // Return default config
        return reply.status(200).send({
          role,
          widgets: ['revenue_trend', 'expense_breakdown', 'cash_flow', 'ar_aging'],
        });
      }

      return reply.status(200).send({
        role: rows[0]!.role,
        widgets: JSON.parse(rows[0]!.widgets),
      });
    },
  );
}
