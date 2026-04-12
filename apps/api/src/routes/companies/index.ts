/**
 * Multi-Company / Branch routes (Phase 5.2):
 *   POST /api/v1/companies              — create company/branch
 *   GET  /api/v1/companies              — list companies
 *   GET  /api/v1/companies/:id          — get company detail
 *   PUT  /api/v1/companies/:id          — update company
 *   POST /api/v1/companies/ic-transaction — intercompany transaction
 *   GET  /api/v1/reports/consolidated    — consolidated report
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  COMPANY_CREATE,
  COMPANY_READ,
  COMPANY_UPDATE,
  GL_JOURNAL_CREATE,
  REPORT_GL_READ,
} from '../../lib/permissions.js';

interface CompanyRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  tax_id: string | null;
  is_branch: boolean;
  parent_company_id: string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapCompany(r: CompanyRow) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    taxId: r.tax_id,
    isBranch: r.is_branch,
    parentCompanyId: r.parent_company_id,
    isActive: r.is_active,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

export async function companyRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /companies
  fastify.post<{ Body: { code: string; name: string; taxId?: string; isBranch?: boolean; parentCompanyId?: string } }>(
    `${API_V1_PREFIX}/companies`,
    {
      schema: {
        description: 'Create a company or branch',
        tags: ['companies'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code', 'name'],
          properties: {
            code: { type: 'string', minLength: 1 },
            name: { type: 'string', minLength: 1 },
            taxId: { type: 'string' },
            isBranch: { type: 'boolean' },
            parentCompanyId: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { code, name, taxId, isBranch = false, parentCompanyId } = request.body;
      const id = crypto.randomUUID();

      if (isBranch && !parentCompanyId) {
        throw new ValidationError({ detail: 'parentCompanyId is required for branches.' });
      }

      await fastify.sql`
        INSERT INTO companies (id, tenant_id, code, name, tax_id, is_branch, parent_company_id)
        VALUES (${id}, ${tenantId}, ${code}, ${name}, ${taxId ?? null}, ${isBranch}, ${parentCompanyId ?? null})
      `;

      const rows = await fastify.sql<[CompanyRow]>`SELECT * FROM companies WHERE id = ${id}`;
      return reply.status(201).send(mapCompany(rows[0]));
    },
  );

  // GET /companies
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/companies`,
    {
      schema: { description: 'List companies', tags: ['companies'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(COMPANY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = Math.min(Math.max(parseInt(request.query['limit'] ?? '50', 10), 1), 100);
      const offset = Math.max(parseInt(request.query['offset'] ?? '0', 10), 0);

      const countRows = await fastify.sql<[{ count: string }]>`
        SELECT COUNT(*)::text as count FROM companies WHERE tenant_id = ${tenantId}
      `;
      const total = parseInt(countRows[0]?.count ?? '0', 10);

      const rows = await fastify.sql<CompanyRow[]>`
        SELECT * FROM companies WHERE tenant_id = ${tenantId} ORDER BY code
        LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ items: rows.map(mapCompany), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // GET /companies/:id
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/companies/:id`,
    {
      schema: {
        description: 'Get company detail',
        tags: ['companies'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<[CompanyRow?]>`
        SELECT * FROM companies WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Company ${request.params.id} not found.` });
      return reply.send(mapCompany(rows[0]));
    },
  );

  // PUT /companies/:id
  fastify.put<{ Params: { id: string }; Body: { name?: string; taxId?: string; isActive?: boolean } }>(
    `${API_V1_PREFIX}/companies/:id`,
    {
      schema: {
        description: 'Update company',
        tags: ['companies'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            taxId: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(COMPANY_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { name, taxId, isActive } = request.body;

      const existing = await fastify.sql<[CompanyRow?]>`
        SELECT * FROM companies WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Company ${id} not found.` });

      await fastify.sql`
        UPDATE companies SET
          name = COALESCE(${name ?? null}, name),
          tax_id = COALESCE(${taxId ?? null}, tax_id),
          is_active = COALESCE(${isActive ?? null}, is_active),
          updated_at = NOW()
        WHERE id = ${id}
      `;

      const rows = await fastify.sql<[CompanyRow]>`SELECT * FROM companies WHERE id = ${id}`;
      return reply.send(mapCompany(rows[0]));
    },
  );

  // POST /companies/ic-transaction — intercompany transaction (auto-create mirror JE)
  fastify.post<{ Body: { fromCompanyId: string; toCompanyId: string; description: string; amountSatang: string; fiscalYear: number; fiscalPeriod: number } }>(
    `${API_V1_PREFIX}/companies/ic-transaction`,
    {
      schema: {
        description: 'Create intercompany transaction with auto mirror entry',
        tags: ['companies'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['fromCompanyId', 'toCompanyId', 'description', 'amountSatang', 'fiscalYear', 'fiscalPeriod'],
          properties: {
            fromCompanyId: { type: 'string' },
            toCompanyId: { type: 'string' },
            description: { type: 'string' },
            amountSatang: { type: 'string' },
            fiscalYear: { type: 'integer' },
            fiscalPeriod: { type: 'integer' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const { fromCompanyId, toCompanyId, description, amountSatang, fiscalYear, fiscalPeriod } = request.body;

      // Verify both companies belong to tenant
      const companies = await fastify.sql<CompanyRow[]>`
        SELECT * FROM companies WHERE tenant_id = ${tenantId} AND id IN (${fromCompanyId}, ${toCompanyId})
      `;
      if (companies.length < 2) {
        throw new ValidationError({ detail: 'Both companies must exist within the same tenant.' });
      }

      const amount = BigInt(amountSatang);

      // Create JE in "from" company: Dr IC Receivable, Cr Cash/Bank
      const jeFromId = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, company_id, posted_at)
        VALUES (${jeFromId}, ${'IC-FROM-' + Date.now()}, ${'IC: ' + description}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${fromCompanyId}, NOW())
      `;
      // IC Receivable (debit) & Cash (credit) — simplified with placeholder accounts
      const line1 = crypto.randomUUID();
      const line2 = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
        VALUES
          (${line1}, ${jeFromId}, 1, COALESCE((SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '1300%' LIMIT 1), 'unknown'), 'IC Receivable', ${amount.toString()}::bigint, 0::bigint),
          (${line2}, ${jeFromId}, 2, COALESCE((SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '1000%' LIMIT 1), 'unknown'), 'Cash/Bank', 0::bigint, ${amount.toString()}::bigint)
      `;

      // Create mirror JE in "to" company: Dr Cash/Bank, Cr IC Payable
      const jeToId = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, company_id, posted_at)
        VALUES (${jeToId}, ${'IC-TO-' + Date.now()}, ${'IC: ' + description}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${toCompanyId}, NOW())
      `;
      const line3 = crypto.randomUUID();
      const line4 = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
        VALUES
          (${line3}, ${jeToId}, 1, COALESCE((SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '1000%' LIMIT 1), 'unknown'), 'Cash/Bank', ${amount.toString()}::bigint, 0::bigint),
          (${line4}, ${jeToId}, 2, COALESCE((SELECT id FROM chart_of_accounts WHERE tenant_id = ${tenantId} AND code LIKE '2300%' LIMIT 1), 'unknown'), 'IC Payable', 0::bigint, ${amount.toString()}::bigint)
      `;

      return reply.status(201).send({
        fromJournalEntryId: jeFromId,
        toJournalEntryId: jeToId,
        fromCompanyId,
        toCompanyId,
        amountSatang: amount.toString(),
        description,
      });
    },
  );

  // GET /reports/consolidated — consolidated across companies
  fastify.get<{ Querystring: { companies: string; fiscalYear?: number } }>(
    `${API_V1_PREFIX}/reports/consolidated`,
    {
      schema: {
        description: 'Consolidated report across companies (sums with IC elimination)',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['companies'],
          properties: {
            companies: { type: 'string', description: 'Comma-separated company IDs' },
            fiscalYear: { type: 'integer' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const companyIds = request.query.companies.split(',').map((s) => s.trim());
      const fiscalYear = request.query.fiscalYear ?? new Date().getFullYear();

      // Get balances per company
      const balances = await fastify.sql<Array<{ company_id: string; account_type: string; total_debit: string; total_credit: string }>>`
        SELECT je.company_id, coa.account_type,
          COALESCE(SUM(jel.debit_satang), 0)::text AS total_debit,
          COALESCE(SUM(jel.credit_satang), 0)::text AS total_credit
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.entry_id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND je.fiscal_year = ${fiscalYear}
          AND je.company_id = ANY(${companyIds})
        GROUP BY je.company_id, coa.account_type
      `;

      // IC elimination: find IC entries between these companies
      const icEntries = await fastify.sql<Array<{ total: string }>>`
        SELECT COALESCE(SUM(jel.debit_satang), 0)::text AS total
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.entry_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND je.fiscal_year = ${fiscalYear}
          AND je.company_id = ANY(${companyIds})
          AND je.description LIKE 'IC:%'
      `;

      // Aggregate by account type
      const consolidated: Record<string, { debit: bigint; credit: bigint }> = {};
      for (const row of balances) {
        if (!consolidated[row.account_type]) {
          consolidated[row.account_type] = { debit: 0n, credit: 0n };
        }
        const entry = consolidated[row.account_type]!;
        entry.debit += BigInt(row.total_debit);
        entry.credit += BigInt(row.total_credit);
      }

      const summary = Object.entries(consolidated).map(([accountType, totals]) => ({
        accountType,
        totalDebitSatang: totals.debit.toString(),
        totalCreditSatang: totals.credit.toString(),
        netSatang: (totals.debit - totals.credit).toString(),
      }));

      return reply.send({
        companyIds,
        fiscalYear,
        icEliminationSatang: icEntries[0]?.total ?? '0',
        summary,
      });
    },
  );
}
