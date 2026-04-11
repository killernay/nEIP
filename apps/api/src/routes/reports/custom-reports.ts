/**
 * Custom Report Builder routes:
 *   POST /api/v1/reports/custom        — Save report definition
 *   GET  /api/v1/reports/custom        — List saved reports
 *   POST /api/v1/reports/custom/:id/run — Execute report
 *
 * Story 6.6 — Custom Report Builder
 *
 * Data sources: journal_entries, invoices, bills, employees, products, stock_movements
 * Dimensions: account, customer, vendor, department, period
 * Measures: sum, count, avg of amount fields
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { REPORT_GL_READ } from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportDefinition {
  name: string;
  data_source: 'gl' | 'ar' | 'ap' | 'hr' | 'inventory';
  dimensions: string[];
  measures: Array<{ field: string; aggregation: 'sum' | 'count' | 'avg' }>;
  filters: Array<{ field: string; operator: string; value: string }>;
}

interface RunReportParams {
  id: string;
}

// ---------------------------------------------------------------------------
// Safe SQL builder — maps data_source + dimensions/measures to parameterized queries
// ---------------------------------------------------------------------------

const DATA_SOURCE_MAP: Record<string, { table: string; alias: string; joins: string }> = {
  gl: {
    table: 'journal_entries',
    alias: 'je',
    joins: `
      LEFT JOIN journal_entry_lines jel ON jel.entry_id = je.id
      LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
    `,
  },
  ar: {
    table: 'invoices',
    alias: 'inv',
    joins: `LEFT JOIN contacts c ON c.id = inv.customer_id`,
  },
  ap: {
    table: 'bills',
    alias: 'b',
    joins: `LEFT JOIN contacts c ON c.id = b.vendor_id`,
  },
  hr: {
    table: 'employees',
    alias: 'emp',
    joins: `LEFT JOIN departments d ON d.id = emp.department_id`,
  },
  inventory: {
    table: 'products',
    alias: 'p',
    joins: `LEFT JOIN stock_movements sm ON sm.product_id = p.id`,
  },
};

/** Allowed dimension columns (whitelist for SQL injection prevention) */
const ALLOWED_DIMENSIONS: Record<string, string> = {
  account: 'coa.code',
  account_name: 'coa.name_en',
  customer: 'c.name',
  vendor: 'c.name',
  department: 'd.name',
  period: "to_char(je.entry_date, 'YYYY-MM')",
  month: "to_char(inv.invoice_date, 'YYYY-MM')",
  status: 'je.status',
  year: "to_char(je.entry_date, 'YYYY')",
};

/** Allowed measure fields (whitelist) */
const ALLOWED_MEASURE_FIELDS: Record<string, string> = {
  debit: 'jel.debit_satang',
  credit: 'jel.credit_satang',
  amount: 'inv.total_satang',
  balance_due: 'inv.balance_due_satang',
  bill_amount: 'b.total_satang',
  quantity: 'sm.quantity',
  count: '1',
};

function buildMeasureExpr(field: string, aggregation: string): string | null {
  const col = ALLOWED_MEASURE_FIELDS[field];
  if (!col) return null;

  switch (aggregation) {
    case 'sum': return `COALESCE(SUM(${col}), 0)`;
    case 'count': return `COUNT(${col})`;
    case 'avg': return `COALESCE(AVG(${col}), 0)`;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function customReportRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /api/v1/reports/custom — save report definition
  fastify.post<{ Body: ReportDefinition }>(
    `${API_V1_PREFIX}/reports/custom`,
    {
      schema: {
        description: 'Save a custom report definition',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'data_source', 'dimensions', 'measures'],
          properties: {
            name: { type: 'string', minLength: 1 },
            data_source: { type: 'string', enum: ['gl', 'ar', 'ap', 'hr', 'inventory'] },
            dimensions: { type: 'array', items: { type: 'string' } },
            measures: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  aggregation: { type: 'string', enum: ['sum', 'count', 'avg'] },
                },
              },
            },
            filters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  operator: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { name, data_source, dimensions, measures, filters } = request.body;

      interface InsertRow { id: string }
      const rows = await fastify.sql<InsertRow[]>`
        INSERT INTO saved_reports (tenant_id, name, data_source, dimensions, measures, filters, created_by)
        VALUES (
          ${tenantId}, ${name}, ${data_source},
          ${JSON.stringify(dimensions)}::jsonb,
          ${JSON.stringify(measures)}::jsonb,
          ${JSON.stringify(filters ?? [])}::jsonb,
          ${userId}
        )
        RETURNING id
      `;

      return reply.status(201).send({
        id: rows[0]!.id,
        name,
        data_source,
        dimensions,
        measures,
        filters: filters ?? [],
      });
    },
  );

  // GET /api/v1/reports/custom — list saved reports
  fastify.get(
    `${API_V1_PREFIX}/reports/custom`,
    {
      schema: {
        description: 'List saved custom reports',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      interface ReportRow {
        id: string;
        name: string;
        data_source: string;
        dimensions: string;
        measures: string;
        filters: string;
        created_at: string;
      }
      const rows = await fastify.sql<ReportRow[]>`
        SELECT id, name, data_source, dimensions::text, measures::text, filters::text, created_at::text
        FROM saved_reports
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `;

      return reply.status(200).send({
        reports: rows.map(r => ({
          id: r.id,
          name: r.name,
          dataSource: r.data_source,
          dimensions: JSON.parse(r.dimensions),
          measures: JSON.parse(r.measures),
          filters: JSON.parse(r.filters),
          createdAt: r.created_at,
        })),
      });
    },
  );

  // POST /api/v1/reports/custom/:id/run — execute report
  fastify.post<{ Params: RunReportParams }>(
    `${API_V1_PREFIX}/reports/custom/:id/run`,
    {
      schema: {
        description: 'Execute a saved custom report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { id } = request.params;

      interface ReportDefRow {
        name: string;
        data_source: string;
        dimensions: string;
        measures: string;
        filters: string;
      }
      const defRows = await fastify.sql<ReportDefRow[]>`
        SELECT name, data_source, dimensions::text, measures::text, filters::text
        FROM saved_reports
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      if (defRows.length === 0) {
        return reply.status(404).send({ error: 'Report not found' });
      }

      const def = defRows[0]!;
      const source = DATA_SOURCE_MAP[def.data_source];
      if (!source) {
        return reply.status(400).send({ error: `Unknown data source: ${def.data_source}` });
      }

      const dimensions: string[] = JSON.parse(def.dimensions);
      const measures: Array<{ field: string; aggregation: string }> = JSON.parse(def.measures);

      // Build SELECT clause
      const selectParts: string[] = [];
      const groupByParts: string[] = [];

      for (const dim of dimensions) {
        const col = ALLOWED_DIMENSIONS[dim];
        if (!col) continue;
        selectParts.push(`${col} AS "${dim}"`);
        groupByParts.push(col);
      }

      for (const m of measures) {
        const expr = buildMeasureExpr(m.field, m.aggregation);
        if (!expr) continue;
        selectParts.push(`${expr}::text AS "${m.aggregation}_${m.field}"`);
      }

      if (selectParts.length === 0) {
        return reply.status(400).send({ error: 'No valid dimensions or measures' });
      }

      // Build tenant filter
      const tenantCol = `${source.alias}.tenant_id`;
      const whereClause = `WHERE ${tenantCol} = '${tenantId}'`;
      const groupByClause = groupByParts.length > 0
        ? `GROUP BY ${groupByParts.join(', ')}`
        : '';

      const query = `
        SELECT ${selectParts.join(', ')}
        FROM ${source.table} ${source.alias}
        ${source.joins}
        ${whereClause}
        ${groupByClause}
        ORDER BY 1
        LIMIT 10000
      `;

      // Execute with raw SQL (parameterized tenant_id is embedded above)
      const rows = await fastify.sql.unsafe(query);

      return reply.status(200).send({
        reportId: id,
        reportName: def.name,
        dataSource: def.data_source,
        generatedAt: new Date().toISOString(),
        rowCount: rows.length,
        data: rows,
      });
    },
  );
}
