/**
 * Batch Payment Run routes (SAP F110 equivalent):
 *   POST /api/v1/ap/batch-payment/propose   — create payment proposal
 *   POST /api/v1/ap/batch-payment/execute   — execute proposal
 *   GET  /api/v1/ap/batch-payment/history   — list past runs
 *
 * SAP-gap Phase 1 — Batch Payment Run
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AP_BATCH_PAYMENT_CREATE,
  AP_BATCH_PAYMENT_READ,
  AP_BATCH_PAYMENT_EXECUTE,
  AP_BANK_FILE_GENERATE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const proposeBodySchema = {
  type: 'object',
  required: ['dueDateFrom', 'dueDateTo'],
  additionalProperties: false,
  properties: {
    dueDateFrom: { type: 'string', format: 'date', description: 'Start of due date range' },
    dueDateTo: { type: 'string', format: 'date', description: 'End of due date range' },
    vendorIds: { type: 'array', items: { type: 'string' }, description: 'Optional filter: specific vendor IDs' },
    bankFileFormat: {
      type: 'string',
      enum: ['promptpay', 'bahtnet', 'smart'],
      default: 'promptpay',
      description: 'Bank file format for payment output',
    },
  },
} as const;

const executeBodySchema = {
  type: 'object',
  required: ['runId'],
  additionalProperties: false,
  properties: {
    runId: { type: 'string', description: 'Batch payment run ID to execute' },
  },
} as const;

const runResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    runDate: { type: 'string', format: 'date' },
    status: { type: 'string' },
    totalVendors: { type: 'integer' },
    totalAmountSatang: { type: 'string' },
    bankFileFormat: { type: 'string' },
    proposalData: { type: 'object', nullable: true },
    executedAt: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const historyQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: { type: 'string', enum: ['proposed', 'executed', 'cancelled'] },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProposeBody {
  dueDateFrom: string;
  dueDateTo: string;
  vendorIds?: string[];
  bankFileFormat?: string;
}

interface ExecuteBody {
  runId: string;
}

interface HistoryQuery {
  limit?: number;
  offset?: number;
  status?: string;
}

interface RunRow {
  id: string;
  run_date: string;
  status: string;
  total_vendors: number;
  total_amount_satang: bigint;
  bank_file_format: string;
  proposal_data: unknown;
  executed_at: Date | string | null;
  created_at: Date | string;
}

interface BillRow {
  id: string;
  vendor_id: string;
  document_number: string;
  total_satang: bigint;
  paid_satang: bigint;
  due_date: string;
}

interface CountRow {
  count: string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function batchPaymentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/ap/batch-payment/propose
  // -------------------------------------------------------------------------
  fastify.post<{ Body: ProposeBody }>(
    `${API_V1_PREFIX}/ap/batch-payment/propose`,
    {
      schema: {
        description: 'Create a batch payment proposal — find all unpaid bills due within date range, grouped by vendor',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        body: proposeBodySchema,
        response: { 201: { description: 'Payment proposal created', ...runResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_BATCH_PAYMENT_CREATE)],
    },
    async (request, reply) => {
      const { dueDateFrom, dueDateTo, vendorIds, bankFileFormat = 'promptpay' } = request.body;
      const { tenantId, sub: userId } = request.user;

      if (dueDateFrom > dueDateTo) {
        throw new ValidationError({ detail: 'dueDateFrom must be <= dueDateTo.' });
      }

      // Find all posted/partial bills with outstanding balance due in range
      let bills: BillRow[];
      if (vendorIds && vendorIds.length > 0) {
        bills = await fastify.sql<BillRow[]>`
          SELECT id, vendor_id, document_number, total_satang, paid_satang, due_date
          FROM bills
          WHERE tenant_id = ${tenantId}
            AND status IN ('posted', 'partial')
            AND total_satang > paid_satang
            AND due_date >= ${dueDateFrom}
            AND due_date <= ${dueDateTo}
            AND vendor_id = ANY(${vendorIds})
          ORDER BY vendor_id, due_date
        `;
      } else {
        bills = await fastify.sql<BillRow[]>`
          SELECT id, vendor_id, document_number, total_satang, paid_satang, due_date
          FROM bills
          WHERE tenant_id = ${tenantId}
            AND status IN ('posted', 'partial')
            AND total_satang > paid_satang
            AND due_date >= ${dueDateFrom}
            AND due_date <= ${dueDateTo}
          ORDER BY vendor_id, due_date
        `;
      }

      if (bills.length === 0) {
        throw new ValidationError({ detail: 'No unpaid bills found in the specified date range.' });
      }

      // Group by vendor
      const vendorMap: Record<string, { vendorId: string; bills: Array<{ billId: string; documentNumber: string; outstandingSatang: string }>; totalSatang: bigint }> = {};
      for (const bill of bills) {
        const outstanding = BigInt(bill.total_satang) - BigInt(bill.paid_satang);
        if (!vendorMap[bill.vendor_id]) {
          vendorMap[bill.vendor_id] = { vendorId: bill.vendor_id, bills: [], totalSatang: 0n };
        }
        const vendorEntry = vendorMap[bill.vendor_id]!;
        vendorEntry.bills.push({
          billId: bill.id,
          documentNumber: bill.document_number,
          outstandingSatang: outstanding.toString(),
        });
        vendorEntry.totalSatang += outstanding;
      }

      const vendors = Object.values(vendorMap);
      const totalAmount = vendors.reduce((sum, v) => sum + v.totalSatang, 0n);

      // Serialize proposal data (convert bigint to string for JSON)
      const proposalData = vendors.map(v => ({
        vendorId: v.vendorId,
        bills: v.bills,
        totalSatang: v.totalSatang.toString(),
      }));

      const runId = crypto.randomUUID();
      const now = new Date();

      await fastify.sql`
        INSERT INTO batch_payment_runs (id, run_date, status, total_vendors, total_amount_satang, bank_file_format, proposal_data, tenant_id, created_by, created_at, updated_at)
        VALUES (${runId}, ${now.toISOString().slice(0, 10)}, 'proposed', ${vendors.length}, ${totalAmount.toString()}::bigint, ${bankFileFormat}, ${JSON.stringify(proposalData)}::jsonb, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      void reply.status(201);
      return {
        id: runId,
        runDate: now.toISOString().slice(0, 10),
        status: 'proposed',
        totalVendors: vendors.length,
        totalAmountSatang: totalAmount.toString(),
        bankFileFormat,
        proposalData,
        executedAt: null,
        createdAt: toISO(now),
      };
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/ap/batch-payment/execute
  // -------------------------------------------------------------------------
  fastify.post<{ Body: ExecuteBody }>(
    `${API_V1_PREFIX}/ap/batch-payment/execute`,
    {
      schema: {
        description: 'Execute a batch payment proposal — create payments + JEs for each vendor',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        body: executeBodySchema,
        response: { 200: { description: 'Batch payment executed', ...runResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_BATCH_PAYMENT_EXECUTE)],
    },
    async (request, _reply) => {
      const { runId } = request.body;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<[RunRow?]>`
        SELECT * FROM batch_payment_runs
        WHERE id = ${runId} AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      const run = rows[0];
      if (!run) {
        throw new NotFoundError({ detail: `Batch payment run ${runId} not found.` });
      }
      if (run.status !== 'proposed') {
        throw new ConflictError({ detail: `Run ${runId} is already ${run.status}.` });
      }

      const proposalData = run.proposal_data as Array<{
        vendorId: string;
        bills: Array<{ billId: string; outstandingSatang: string }>;
        totalSatang: string;
      }>;

      // Look up Cash and AP accounts
      const cashRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND (code LIKE '1110%' OR code LIKE '1120%')
          AND account_type = 'asset'
        ORDER BY code ASC LIMIT 1
      `;
      const apRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND code LIKE '2110%'
          AND account_type = 'liability'
        ORDER BY code ASC LIMIT 1
      `;

      const cashAccountId = cashRows[0]?.id;
      const apAccountId = apRows[0]?.id;
      if (!cashAccountId || !apAccountId) {
        throw new ValidationError({ detail: 'Cannot find Cash or AP accounts in chart of accounts.' });
      }

      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;

      // Process each vendor
      for (const vendor of proposalData) {
        const paymentAmount = BigInt(vendor.totalSatang);

        // Create JE for each vendor payment
        const jeId = crypto.randomUUID();
        const jeDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);

        await fastify.sql`
          INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
          VALUES (${jeId}, ${jeDocNumber}, ${'Batch payment to vendor ' + vendor.vendorId}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
        `;

        // Dr AP, Cr Cash
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
          VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${apAccountId}, ${'AP clearance — vendor ' + vendor.vendorId}, ${paymentAmount.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
        `;
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
          VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${cashAccountId}, ${'Cash payment — vendor ' + vendor.vendorId}, 0::bigint, ${paymentAmount.toString()}::bigint, ${now.toISOString()}::timestamptz)
        `;

        // Create bill_payment records and update bill statuses
        for (const bill of vendor.bills) {
          const bpId = crypto.randomUUID();
          const bpDocNumber = await nextDocNumber(fastify.sql, tenantId, 'bill_payment', fiscalYear);
          const amount = BigInt(bill.outstandingSatang);

          await fastify.sql`
            INSERT INTO bill_payments (id, document_number, bill_id, amount_satang, payment_date, payment_method, journal_entry_id, tenant_id, created_by, created_at, updated_at)
            VALUES (${bpId}, ${bpDocNumber}, ${bill.billId}, ${amount.toString()}::bigint, ${now.toISOString().slice(0, 10)}, 'bank_transfer', ${jeId}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
          `;

          // Update bill paid_satang and status
          await fastify.sql`
            UPDATE bills
            SET paid_satang = paid_satang + ${amount.toString()}::bigint,
                status = CASE
                  WHEN paid_satang + ${amount.toString()}::bigint >= total_satang THEN 'paid'
                  ELSE 'partial'
                END,
                updated_at = ${now.toISOString()}::timestamptz
            WHERE id = ${bill.billId} AND tenant_id = ${tenantId}
          `;
        }
      }

      // Mark run as executed
      await fastify.sql`
        UPDATE batch_payment_runs
        SET status = 'executed', executed_at = ${now.toISOString()}::timestamptz, updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${runId} AND tenant_id = ${tenantId}
      `;

      return {
        id: run.id,
        runDate: run.run_date,
        status: 'executed',
        totalVendors: run.total_vendors,
        totalAmountSatang: run.total_amount_satang.toString(),
        bankFileFormat: run.bank_file_format,
        proposalData: run.proposal_data,
        executedAt: toISO(now),
        createdAt: toISO(run.created_at),
      };
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/ap/batch-payment/history
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: HistoryQuery }>(
    `${API_V1_PREFIX}/ap/batch-payment/history`,
    {
      schema: {
        description: 'List past batch payment runs',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        querystring: historyQuerySchema,
        response: {
          200: {
            description: 'Paginated list of batch payment runs',
            type: 'object',
            properties: {
              items: { type: 'array', items: runResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AP_BATCH_PAYMENT_READ)],
    },
    async (request, _reply) => {
      const { tenantId } = request.user;
      const { limit = 20, offset = 0, status } = request.query;

      let items: RunRow[];
      let countRows: CountRow[];

      if (status) {
        [items, countRows] = await Promise.all([
          fastify.sql<RunRow[]>`
            SELECT * FROM batch_payment_runs
            WHERE tenant_id = ${tenantId} AND status = ${status}
            ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
          `,
          fastify.sql<CountRow[]>`
            SELECT count(*)::text as count FROM batch_payment_runs
            WHERE tenant_id = ${tenantId} AND status = ${status}
          `,
        ]);
      } else {
        [items, countRows] = await Promise.all([
          fastify.sql<RunRow[]>`
            SELECT * FROM batch_payment_runs
            WHERE tenant_id = ${tenantId}
            ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
          `,
          fastify.sql<CountRow[]>`
            SELECT count(*)::text as count FROM batch_payment_runs
            WHERE tenant_id = ${tenantId}
          `,
        ]);
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);

      return {
        items: items.map(r => ({
          id: r.id,
          runDate: r.run_date,
          status: r.status,
          totalVendors: r.total_vendors,
          totalAmountSatang: r.total_amount_satang.toString(),
          bankFileFormat: r.bank_file_format,
          proposalData: r.proposal_data,
          executedAt: r.executed_at ? toISO(r.executed_at) : null,
          createdAt: toISO(r.created_at),
        })),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    },
  );

  // -------------------------------------------------------------------------
  // Shared helper: load batch run + vendor data
  // -------------------------------------------------------------------------
  async function loadRunWithVendors(fastify: FastifyInstance, runId: string, tenantId: string) {
    const rows = await fastify.sql<[RunRow?]>`
      SELECT * FROM batch_payment_runs WHERE id = ${runId} AND tenant_id = ${tenantId} LIMIT 1
    `;
    if (!rows[0]) throw new NotFoundError({ detail: `Batch payment run ${runId} not found.` });
    if (rows[0].status !== 'executed') {
      throw new ValidationError({ detail: 'Run must be executed before generating payment files.' });
    }

    const run = rows[0];
    const proposalData = run.proposal_data as Array<{
      vendorId: string;
      bills: Array<{ billId: string; outstandingSatang: string }>;
      totalSatang: string;
    }>;

    // Enrich with vendor info (tax ID, name, bank account)
    interface VendorInfo { id: string; name: string; tax_id: string | null; bank_account: string | null; }
    const vendorIds = proposalData.map(v => v.vendorId);
    const vendors = vendorIds.length > 0
      ? await fastify.sql<VendorInfo[]>`SELECT id, name, tax_id, bank_account FROM vendors WHERE id = ANY(${vendorIds})`
      : [];
    const vendorMap = new Map(vendors.map(v => [v.id, v]));

    return { run, proposalData, vendorMap };
  }

  // -------------------------------------------------------------------------
  // GET /api/v1/ap/batch-payment/:id/promptpay-file
  // PromptPay B2B format (pipe-delimited)
  // -------------------------------------------------------------------------
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/ap/batch-payment/:id/promptpay-file`,
    {
      schema: {
        description: 'Generate PromptPay B2B payment file (pipe-delimited)',
        tags: ['ap', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(AP_BANK_FILE_GENERATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { run, proposalData, vendorMap } = await loadRunWithVendors(fastify, id, tenantId);

      // PromptPay B2B format: pipe-delimited lines
      // Format: RecipientTaxID|Amount(satang)|Reference|RecipientName
      const lines = proposalData.map((v, idx) => {
        const vendor = vendorMap.get(v.vendorId);
        const taxId = vendor?.tax_id ?? '0000000000000';
        const name = vendor?.name ?? v.vendorId;
        const ref = `BP-${run.id.slice(0, 8)}-${String(idx + 1).padStart(3, '0')}`;
        return `${taxId}|${v.totalSatang}|${ref}|${name}`;
      });

      const header = `H|PROMPTPAY_B2B|${run.run_date}|${proposalData.length}|${run.total_amount_satang}`;
      const content = [header, ...lines].join('\n');

      void reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="promptpay-${run.id.slice(0, 8)}.txt"`);
      return content;
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/ap/batch-payment/:id/bahtnet-file
  // BOT BAHTNET format for large-value transfers
  // -------------------------------------------------------------------------
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/ap/batch-payment/:id/bahtnet-file`,
    {
      schema: {
        description: 'Generate BAHTNET payment file (BOT large-value transfer format)',
        tags: ['ap', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(AP_BANK_FILE_GENERATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const { run, proposalData, vendorMap } = await loadRunWithVendors(fastify, id, tenantId);

      // BAHTNET format: fixed-width fields
      // Header: BAHTNET|Date|TotalRecords|TotalAmount
      // Detail: SeqNo|SenderRef|ReceiverBankAccount|Amount|ReceiverName|ReceiverTaxID
      const header = `BAHTNET|${run.run_date.replace(/-/g, '')}|${String(proposalData.length).padStart(6, '0')}|${run.total_amount_satang.toString().padStart(15, '0')}`;
      const details = proposalData.map((v, idx) => {
        const vendor = vendorMap.get(v.vendorId);
        const seqNo = String(idx + 1).padStart(6, '0');
        const senderRef = `BP${run.id.slice(0, 8)}`.toUpperCase();
        const bankAccount = vendor?.bank_account ?? '0000000000';
        const amount = v.totalSatang.padStart(15, '0');
        const name = (vendor?.name ?? v.vendorId).padEnd(70, ' ').slice(0, 70);
        const taxId = (vendor?.tax_id ?? '0000000000000').padEnd(13, '0');
        return `${seqNo}|${senderRef}|${bankAccount}|${amount}|${name}|${taxId}`;
      });

      const content = [header, ...details].join('\n');

      void reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="bahtnet-${run.id.slice(0, 8)}.txt"`);
      return content;
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/ap/batch-payment/:id/bank-file?bank=scb|kbank|bbl
  // Thai bank-specific payment file formats
  // -------------------------------------------------------------------------
  fastify.get<{ Params: { id: string }; Querystring: { bank: string } }>(
    `${API_V1_PREFIX}/ap/batch-payment/:id/bank-file`,
    {
      schema: {
        description: 'Generate Thai bank-specific payment file (SCB, KBank, BBL)',
        tags: ['ap', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        querystring: {
          type: 'object',
          required: ['bank'],
          properties: { bank: { type: 'string', enum: ['scb', 'kbank', 'bbl'] } },
        },
      },
      preHandler: [requireAuth, requirePermission(AP_BANK_FILE_GENERATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { bank } = request.query;
      const { tenantId } = request.user;
      const { run, proposalData, vendorMap } = await loadRunWithVendors(fastify, id, tenantId);

      const dateCompact = run.run_date.replace(/-/g, '');
      let content: string;

      if (bank === 'scb') {
        // SCB Direct Debit format (comma-separated)
        const header = `HD,SCB,${dateCompact},${proposalData.length}`;
        const details = proposalData.map((v, idx) => {
          const vendor = vendorMap.get(v.vendorId);
          return `DT,${String(idx + 1).padStart(6, '0')},${vendor?.bank_account ?? ''},${v.totalSatang},${vendor?.name ?? v.vendorId},${vendor?.tax_id ?? ''}`;
        });
        const trailer = `TR,${run.total_amount_satang}`;
        content = [header, ...details, trailer].join('\n');
      } else if (bank === 'kbank') {
        // KBank Corporate Payment format (pipe-delimited)
        const header = `KBANK|PAYMENT|${dateCompact}|${proposalData.length}|${run.total_amount_satang}`;
        const details = proposalData.map((v, idx) => {
          const vendor = vendorMap.get(v.vendorId);
          return `${String(idx + 1)}|${vendor?.bank_account ?? ''}|${v.totalSatang}|${vendor?.name ?? v.vendorId}|${vendor?.tax_id ?? ''}|THB`;
        });
        content = [header, ...details].join('\n');
      } else {
        // BBL Smart Payments format (fixed-width inspired, pipe-delimited)
        const header = `BBL|BULK|${dateCompact}|${String(proposalData.length).padStart(5, '0')}|${run.total_amount_satang.toString().padStart(15, '0')}`;
        const details = proposalData.map((v, idx) => {
          const vendor = vendorMap.get(v.vendorId);
          return `${String(idx + 1).padStart(5, '0')}|${vendor?.bank_account ?? '0'.repeat(10)}|${v.totalSatang.padStart(15, '0')}|${(vendor?.name ?? v.vendorId).slice(0, 50)}|${vendor?.tax_id ?? ''}`;
        });
        content = [header, ...details].join('\n');
      }

      void reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${bank}-payment-${run.id.slice(0, 8)}.txt"`);
      return content;
    },
  );
}
