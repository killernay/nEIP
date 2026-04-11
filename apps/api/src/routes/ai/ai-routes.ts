/**
 * AI Agent routes:
 *   POST /api/v1/ai/anomaly-scan        — Run anomaly detection (6.1)
 *   GET  /api/v1/ai/cash-forecast       — Cash flow forecast (6.2)
 *   POST /api/v1/ai/categorize          — Smart categorization (6.3)
 *   POST /api/v1/ai/bank-reconcile/:id  — Bank auto-reconciliation (6.4)
 *   POST /api/v1/ai/parse-document      — NLP document parsing (6.5)
 *   GET  /api/v1/ai/predictions         — Predictive analytics (6.8)
 *
 * Stories 6.1-6.5, 6.8
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { REPORT_GL_READ, FI_BANK_RECONCILE } from '../../lib/permissions.js';
import {
  AnomalyDetectionAgent,
  CashFlowForecastAgent,
  CategorizationAgent,
  BankReconAgent,
  DocumentParserAgent,
  PredictiveAgent,
} from '@neip/ai';
import type { AgentContext } from '@neip/ai';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(request: { user: { tenantId: string; sub: string } }): AgentContext {
  return {
    tenantId: request.user.tenantId,
    userId: request.user.sub,
    correlationId: crypto.randomUUID(),
    metadata: {},
  };
}

// ---------------------------------------------------------------------------
// Route types
// ---------------------------------------------------------------------------

interface AnomalyScanQuery {
  period?: string;
}

interface CashForecastQuery {
  days?: number;
}

interface CategorizeBody {
  description: string;
  amount: number;
}

interface BankReconcileParams {
  bankAccountId: string;
}

interface PredictionsQuery {
  type?: 'revenue' | 'expense';
  months?: number;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function aiHandlers(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // -------------------------------------------------------------------------
  // POST /api/v1/ai/anomaly-scan?period=YYYY-MM
  // -------------------------------------------------------------------------
  fastify.post<{ Querystring: AnomalyScanQuery }>(
    `${API_V1_PREFIX}/ai/anomaly-scan`,
    {
      schema: {
        description: 'Run anomaly detection on journal entries for a period',
        tags: ['ai'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', pattern: '^\\d{4}-\\d{2}$', description: 'Period in YYYY-MM format' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const now = new Date();
      const period = request.query.period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [year, month] = period.split('-');

      const periodStart = `${year!}-${month!}-01`;
      const periodEnd = `${year!}-${month!}-${new Date(parseInt(year!, 10), parseInt(month!, 10), 0).getDate()}`;

      // Fetch journal entries with lines
      interface JeRow {
        id: string;
        entry_number: string;
        entry_date: string;
        posted_at: string;
        total_debit: string;
        total_credit: string;
        status: string;
        description: string | null;
        created_by: string;
      }
      interface JeLineRow {
        entry_id: string;
        account_id: string;
        account_code: string;
        debit_satang: string;
        credit_satang: string;
      }

      const jeRows = await fastify.sql<JeRow[]>`
        SELECT id, entry_number, entry_date::text, posted_at::text,
               total_debit_satang::text as total_debit, total_credit_satang::text as total_credit,
               status, description, created_by
        FROM journal_entries
        WHERE tenant_id = ${tenantId}
          AND entry_date >= ${periodStart}::date
          AND entry_date <= ${periodEnd}::date
      `;

      const jeIds = jeRows.map(r => r.id);
      const lineRows = jeIds.length > 0
        ? await fastify.sql<JeLineRow[]>`
            SELECT jel.entry_id, jel.account_id, coa.code as account_code,
                   jel.debit_satang::text, jel.credit_satang::text
            FROM journal_entry_lines jel
            JOIN chart_of_accounts coa ON coa.id = jel.account_id
            WHERE jel.entry_id = ANY(${jeIds}::uuid[])
          `
        : [];

      // Group lines by entry
      const linesByEntry = new Map<string, JeLineRow[]>();
      for (const line of lineRows) {
        const group = linesByEntry.get(line.entry_id) ?? [];
        group.push(line);
        linesByEntry.set(line.entry_id, group);
      }

      const journalEntries = jeRows.map(je => ({
        id: je.id,
        entryNumber: je.entry_number,
        date: je.entry_date,
        postedAt: je.posted_at ?? je.entry_date,
        totalDebit: BigInt(je.total_debit),
        totalCredit: BigInt(je.total_credit),
        status: je.status as 'draft' | 'posted' | 'voided',
        description: je.description ?? undefined,
        createdBy: je.created_by,
        lines: (linesByEntry.get(je.id) ?? []).map(l => ({
          accountId: l.account_id,
          accountCode: l.account_code,
          debitSatang: BigInt(l.debit_satang),
          creditSatang: BigInt(l.credit_satang),
        })),
      }));

      const agent = new AnomalyDetectionAgent();
      const result = await agent.execute(
        { period, journalEntries },
        makeContext(request),
      );

      if (!result.success) {
        return reply.status(400).send({
          error: result.error.detail,
          reasoning: result.reasoning,
        });
      }

      return reply.status(200).send({
        ...result.data,
        confidence: result.confidence,
        zone: result.zone,
        reasoning: result.reasoning,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/ai/cash-forecast?days=30
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: CashForecastQuery }>(
    `${API_V1_PREFIX}/ai/cash-forecast`,
    {
      schema: {
        description: 'Get cash flow forecast',
        tags: ['ai'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const days = request.query.days ?? 30;

      // Get opening cash balance (bank/cash accounts)
      interface BalRow { balance: string }
      const balRows = await fastify.sql<BalRow[]>`
        SELECT COALESCE(SUM(jel.debit_satang) - SUM(jel.credit_satang), 0)::text as balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.entry_id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND coa.code LIKE '1%'
          AND coa.account_type = 'asset'
      `;
      const openingBalance = BigInt(balRows[0]?.balance ?? '0');

      // Get AR aging (outstanding invoices)
      interface ArRow { id: string; amount_due: string; due_date: string; customer_id: string }
      const arRows = await fastify.sql<ArRow[]>`
        SELECT id, balance_due_satang::text as amount_due, due_date::text, customer_id
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND status IN ('sent', 'overdue')
          AND balance_due_satang > 0
      `;

      // Get AP aging (outstanding bills)
      interface ApRow { id: string; amount_due: string; due_date: string; vendor_id: string }
      const apRows = await fastify.sql<ApRow[]>`
        SELECT id, balance_due_satang::text as amount_due, due_date::text, vendor_id
        FROM bills
        WHERE tenant_id = ${tenantId}
          AND status IN ('approved', 'overdue')
          AND balance_due_satang > 0
      `;

      const agent = new CashFlowForecastAgent();
      const result = await agent.execute(
        {
          openingBalanceSatang: openingBalance,
          forecastDays: days,
          arAging: arRows.map(r => ({
            invoiceId: r.id,
            customerId: r.customer_id,
            amountDueSatang: BigInt(r.amount_due),
            dueDate: r.due_date,
          })),
          apAging: apRows.map(r => ({
            billId: r.id,
            vendorId: r.vendor_id,
            amountDueSatang: BigInt(r.amount_due),
            dueDate: r.due_date,
          })),
          recurringJes: [],
        },
        makeContext(request),
      );

      if (!result.success) {
        return reply.status(400).send({
          error: result.error.detail,
          reasoning: result.reasoning,
        });
      }

      return reply.status(200).send({
        ...result.data,
        confidence: result.confidence,
        zone: result.zone,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/ai/categorize
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CategorizeBody }>(
    `${API_V1_PREFIX}/ai/categorize`,
    {
      schema: {
        description: 'Smart categorization of a bank transaction',
        tags: ['ai'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['description', 'amount'],
          properties: {
            description: { type: 'string' },
            amount: { type: 'number', description: 'Amount in satang' },
          },
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      // Load tenant-specific categorization rules
      interface RuleRow {
        id: string;
        keyword_pattern: string;
        account_id: string;
        code: string;
        name_en: string;
        hit_count: number;
      }
      const ruleRows = await fastify.sql<RuleRow[]>`
        SELECT cr.id, cr.keyword_pattern, cr.account_id, coa.code, coa.name_en, cr.hit_count
        FROM categorization_rules cr
        JOIN chart_of_accounts coa ON coa.id = cr.account_id
        WHERE cr.tenant_id = ${tenantId}
        ORDER BY cr.hit_count DESC
      `;

      const agent = new CategorizationAgent();
      const result = await agent.execute(
        {
          description: request.body.description,
          amount: BigInt(request.body.amount),
          rules: ruleRows.map(r => ({
            id: r.id,
            keywordPattern: r.keyword_pattern,
            accountId: r.account_id,
            accountCode: r.code,
            accountName: r.name_en,
            hitCount: r.hit_count,
          })),
        },
        makeContext(request),
      );

      if (!result.success) {
        return reply.status(400).send({
          error: result.error.detail,
          reasoning: result.reasoning,
        });
      }

      return reply.status(200).send({
        ...result.data,
        confidence: result.confidence,
        zone: result.zone,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/ai/bank-reconcile/:bankAccountId
  // -------------------------------------------------------------------------
  fastify.post<{ Params: BankReconcileParams }>(
    `${API_V1_PREFIX}/ai/bank-reconcile/:bankAccountId`,
    {
      schema: {
        description: 'Auto-reconcile bank transactions against journal entries',
        tags: ['ai'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['bankAccountId'],
          properties: {
            bankAccountId: { type: 'string', format: 'uuid' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_BANK_RECONCILE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { bankAccountId } = request.params;

      // Fetch unreconciled bank transactions
      interface BtxRow {
        id: string;
        transaction_date: string;
        amount_satang: string;
        description: string;
        reference: string;
      }
      const btxRows = await fastify.sql<BtxRow[]>`
        SELECT id, transaction_date::text, amount_satang::text,
               COALESCE(description, '') as description, COALESCE(reference, '') as reference
        FROM bank_transactions
        WHERE bank_account_id = ${bankAccountId}
          AND tenant_id = ${tenantId}
          AND reconciled = false
        ORDER BY transaction_date
      `;

      // Fetch unreconciled journal entries for this bank account
      interface LeRow {
        id: string;
        entry_number: string;
        entry_date: string;
        amount: string;
        description: string;
        reference: string;
      }
      const leRows = await fastify.sql<LeRow[]>`
        SELECT je.id, je.entry_number, je.entry_date::text,
               (jel.debit_satang - jel.credit_satang)::text as amount,
               COALESCE(je.description, '') as description,
               COALESCE(je.reference, '') as reference
        FROM journal_entries je
        JOIN journal_entry_lines jel ON jel.entry_id = je.id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        JOIN bank_accounts ba ON ba.gl_account_id = coa.id
        WHERE je.tenant_id = ${tenantId}
          AND ba.id = ${bankAccountId}
          AND je.status = 'posted'
        ORDER BY je.entry_date
      `;

      const agent = new BankReconAgent();
      const result = await agent.execute(
        {
          bankAccountId,
          bankTransactions: btxRows.map(r => ({
            id: r.id,
            date: r.transaction_date,
            amountSatang: BigInt(r.amount_satang),
            description: r.description,
            reference: r.reference,
          })),
          ledgerEntries: leRows.map(r => ({
            journalEntryId: r.id,
            entryNumber: r.entry_number,
            date: r.entry_date,
            amountSatang: BigInt(r.amount),
            description: r.description,
            reference: r.reference,
          })),
        },
        makeContext(request),
      );

      if (!result.success) {
        return reply.status(400).send({
          error: result.error.detail,
          reasoning: result.reasoning,
        });
      }

      return reply.status(200).send({
        ...result.data,
        confidence: result.confidence,
        zone: result.zone,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/ai/parse-document
  // -------------------------------------------------------------------------
  fastify.post(
    `${API_V1_PREFIX}/ai/parse-document`,
    {
      schema: {
        description: 'Parse a document (invoice/receipt) using NLP',
        tags: ['ai'],
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const buffer = await file.toBuffer();
      const content = buffer.toString('utf-8');

      const agent = new DocumentParserAgent();
      const result = await agent.execute(
        {
          content,
          filename: file.filename,
          mimeType: file.mimetype,
        },
        makeContext(request),
      );

      if (!result.success) {
        return reply.status(400).send({
          error: result.error.detail,
          reasoning: result.reasoning,
        });
      }

      return reply.status(200).send({
        ...result.data,
        confidence: result.confidence,
        zone: result.zone,
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/ai/predictions?type=revenue|expense&months=6
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: PredictionsQuery }>(
    `${API_V1_PREFIX}/ai/predictions`,
    {
      schema: {
        description: 'Get predictive analytics (revenue/expense forecast)',
        tags: ['ai'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['revenue', 'expense'], default: 'revenue' },
            months: { type: 'integer', minimum: 1, maximum: 24, default: 6 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_GL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const predictionType = request.query.type ?? 'revenue';
      const forecastMonths = request.query.months ?? 6;

      const accountType = predictionType === 'revenue' ? 'revenue' : 'expense';
      const sign = predictionType === 'revenue' ? 'credit' : 'debit';

      interface MonthRow { period: string; amount: string }
      const rows = await fastify.sql<MonthRow[]>`
        SELECT
          to_char(je.posted_at, 'YYYY-MM') as period,
          COALESCE(
            SUM(CASE WHEN ${sign} = 'credit'
              THEN jel.credit_satang - jel.debit_satang
              ELSE jel.debit_satang - jel.credit_satang
            END), 0
          )::text as amount
        FROM journal_entries je
        JOIN journal_entry_lines jel ON jel.entry_id = je.id
        JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE je.tenant_id = ${tenantId}
          AND je.status = 'posted'
          AND coa.account_type = ${accountType}
          AND je.posted_at >= (CURRENT_DATE - INTERVAL '12 months')
        GROUP BY to_char(je.posted_at, 'YYYY-MM')
        ORDER BY period
      `;

      const agent = new PredictiveAgent();
      const result = await agent.execute(
        {
          type: predictionType as 'revenue' | 'expense',
          historicalData: rows.map(r => ({
            period: r.period,
            amountSatang: BigInt(r.amount),
          })),
          forecastMonths,
        },
        makeContext(request),
      );

      if (!result.success) {
        return reply.status(400).send({
          error: result.error.detail,
          reasoning: result.reasoning,
        });
      }

      return reply.status(200).send({
        ...result.data,
        confidence: result.confidence,
        zone: result.zone,
      });
    },
  );
}
