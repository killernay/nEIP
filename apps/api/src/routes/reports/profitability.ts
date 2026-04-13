/**
 * CO-PA Profitability Analysis routes:
 *   GET /api/v1/reports/profitability — P&L by any dimension combination
 *
 * Dimensions: customer, product, branch, project
 * Multi-level contribution margin:
 *   Revenue - COGS = Gross Margin - Direct Costs = Contribution - Overhead = Net
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { REPORT_PROFITABILITY_READ } from '../../lib/permissions.js';

interface ProfitRow {
  dim_id: string;
  dim_name: string;
  revenue_satang: string;
}

interface CogsRow {
  dim_id: string;
  cogs_satang: string;
}

export async function profitabilityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  fastify.get(
    `${API_V1_PREFIX}/reports/profitability`,
    {
      schema: {
        description: 'CO-PA Profitability Analysis — P&L by any dimension',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            dimension: {
              type: 'string',
              enum: ['customer', 'product', 'branch', 'project'],
              description: 'Primary grouping dimension',
            },
            period: { type: 'string', description: 'Period filter (YYYY-MM or YYYY)' },
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_PROFITABILITY_READ)],
    },
    async (request) => {
      const { tenantId } = request.user;
      const q = request.query as {
        dimension?: string; period?: string; from?: string; to?: string;
      };

      const dimension = q.dimension ?? 'customer';

      // Determine date range
      let dateFrom = q.from ?? '2000-01-01';
      let dateTo = q.to ?? '2099-12-31';
      if (q.period) {
        if (q.period.length === 7) {
          // YYYY-MM
          dateFrom = `${q.period}-01`;
          const parts = q.period.split('-');
          const y = Number(parts[0]);
          const m = Number(parts[1]);
          const lastDay = new Date(y, m, 0).getDate();
          dateTo = `${q.period}-${String(lastDay).padStart(2, '0')}`;
        } else if (q.period.length === 4) {
          dateFrom = `${q.period}-01-01`;
          dateTo = `${q.period}-12-31`;
        }
      }

      // Build dimension column and join
      let dimensionCol: string;
      let dimensionName: string;
      let joinClause = '';

      switch (dimension) {
        case 'product':
          dimensionCol = 'il.product_id';
          dimensionName = "COALESCE(p.name_th, il.description)";
          joinClause = 'LEFT JOIN products p ON p.id = il.product_id';
          break;
        case 'branch':
          dimensionCol = "COALESCE(i.branch_id, 'HQ')";
          dimensionName = "COALESCE(i.branch_id, 'HQ')";
          break;
        case 'project':
          dimensionCol = "COALESCE(i.project_id, 'unassigned')";
          dimensionName = "COALESCE(pr.name, 'Unassigned')";
          joinClause = 'LEFT JOIN projects pr ON pr.id = i.project_id';
          break;
        default:
          // customer
          dimensionCol = 'i.customer_id';
          dimensionName = "COALESCE(c.name, i.customer_id)";
          joinClause = 'LEFT JOIN customers c ON c.id = i.customer_id';
      }

      // Revenue from posted invoices
      const revenueRows = await fastify.sql.unsafe<ProfitRow[]>(`
        SELECT
          ${dimensionCol} AS dim_id,
          ${dimensionName} AS dim_name,
          COALESCE(SUM(il.amount_satang), 0)::text AS revenue_satang
        FROM invoices i
        JOIN invoice_lines il ON il.invoice_id = i.id
        ${joinClause}
        WHERE i.tenant_id = '${tenantId}'
          AND i.status IN ('posted','paid','partial_paid')
          AND i.invoice_date BETWEEN '${dateFrom}'::date AND '${dateTo}'::date
        GROUP BY 1, 2
        ORDER BY revenue_satang DESC
      `);

      // COGS from product cost prices
      const cogsRows = await fastify.sql.unsafe<CogsRow[]>(`
        SELECT
          ${dimensionCol} AS dim_id,
          COALESCE(SUM(
            CASE WHEN p2.cost_price_satang IS NOT NULL
              THEN p2.cost_price_satang * il.quantity
              ELSE 0 END
          ), 0)::text AS cogs_satang
        FROM invoices i
        JOIN invoice_lines il ON il.invoice_id = i.id
        LEFT JOIN products p2 ON p2.id = il.product_id
        ${joinClause}
        WHERE i.tenant_id = '${tenantId}'
          AND i.status IN ('posted','paid','partial_paid')
          AND i.invoice_date BETWEEN '${dateFrom}'::date AND '${dateTo}'::date
        GROUP BY 1
      `);

      const cogsMap = new Map<string, string>();
      for (const row of cogsRows) {
        cogsMap.set(row.dim_id, row.cogs_satang);
      }

      // Build profitability rows
      const data = revenueRows.map((r) => {
        const revenue = BigInt(r.revenue_satang || '0');
        const cogs = BigInt(cogsMap.get(r.dim_id) || '0');
        const grossMargin = revenue - cogs;
        const contribution = grossMargin;
        const grossMarginPct = revenue > 0n
          ? Number(grossMargin * 10000n / revenue) / 100
          : 0;

        return {
          dimensionId: r.dim_id,
          dimensionName: r.dim_name,
          revenueSatang: revenue.toString(),
          cogsSatang: cogs.toString(),
          grossMarginSatang: grossMargin.toString(),
          grossMarginPercent: grossMarginPct,
          contributionSatang: contribution.toString(),
        };
      });

      // Summary totals
      const totalRevenue = data.reduce((s, r) => s + BigInt(r.revenueSatang), 0n);
      const totalCogs = data.reduce((s, r) => s + BigInt(r.cogsSatang), 0n);
      const totalGrossMargin = totalRevenue - totalCogs;

      return {
        dimension,
        period: { from: dateFrom, to: dateTo },
        data,
        summary: {
          totalRevenueSatang: totalRevenue.toString(),
          totalCogsSatang: totalCogs.toString(),
          totalGrossMarginSatang: totalGrossMargin.toString(),
          totalGrossMarginPercent: totalRevenue > 0n
            ? Number(totalGrossMargin * 10000n / totalRevenue) / 100
            : 0,
        },
      };
    },
  );
}
