/**
 * Finance (FI) gap routes — SAP-gap Phase 2:
 *   POST /api/v1/fixed-assets/:id/capitalize      — AuC capitalization
 *   POST /api/v1/bank/:id/import-mt940            — MT940 bank statement import
 *   POST /api/v1/vendors/:id/evaluate              — vendor evaluation
 *   GET  /api/v1/vendors/:id/scorecard             — vendor scorecard
 *   POST /api/v1/ar/interest-calculation/run       — interest on overdue
 *   CRUD /api/v1/ar/disputes                       — dispute management
 *   POST /api/v1/ar/disputes/:id/resolve           — resolve dispute
 *   POST /api/v1/ar/payment-advice                 — payment advice processing
 *   GET  /api/v1/reports/contribution-margin        — multi-level contribution margin
 *   GET  /api/v1/month-end/cockpit                 — closing cockpit
 *   POST /api/v1/month-end/cockpit                 — create closing task
 *   POST /api/v1/month-end/cockpit/:taskId/complete — complete closing task
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  FI_ASSET_CAPITALIZE,
  FI_BANK_IMPORT_MT940,
  AP_VENDOR_EVALUATE,
  AR_INTEREST_RUN,
  AR_DISPUTE_CREATE,
  AR_DISPUTE_READ,
  AR_DISPUTE_RESOLVE,
  AR_PAYMENT_ADVICE_PROCESS,
  REPORT_CONTRIBUTION_MARGIN_READ,
  FI_CLOSING_MANAGE,
  FI_CLOSING_READ,
} from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const capitalizeBody = {
  type: 'object',
  additionalProperties: false,
  properties: {
    capitalizationDate: { type: 'string', format: 'date' },
  },
} as const;

const vendorEvalBody = {
  type: 'object',
  required: ['period', 'deliveryScore', 'qualityScore', 'priceScore', 'serviceScore'],
  additionalProperties: false,
  properties: {
    period: { type: 'string', minLength: 1, description: 'YYYY-MM or YYYY-Q1' },
    deliveryScore: { type: 'number', minimum: 0, maximum: 100 },
    qualityScore: { type: 'number', minimum: 0, maximum: 100 },
    priceScore: { type: 'number', minimum: 0, maximum: 100 },
    serviceScore: { type: 'number', minimum: 0, maximum: 100 },
    notes: { type: 'string' },
  },
} as const;

const interestCalcBody = {
  type: 'object',
  additionalProperties: false,
  properties: {
    annualRateBp: { type: 'integer', minimum: 0, default: 750, description: 'Annual interest rate in basis points (750 = 7.5%)' },
    asOfDate: { type: 'string', format: 'date' },
  },
} as const;

const disputeCreateBody = {
  type: 'object',
  required: ['invoiceId', 'customerId', 'disputeType', 'amountSatang'],
  additionalProperties: false,
  properties: {
    invoiceId: { type: 'string' },
    customerId: { type: 'string' },
    disputeType: { type: 'string', minLength: 1 },
    amountSatang: { type: 'string' },
    notes: { type: 'string' },
  },
} as const;

const disputeResolveBody = {
  type: 'object',
  required: ['resolution'],
  additionalProperties: false,
  properties: {
    resolution: { type: 'string', minLength: 1 },
    creditNoteId: { type: 'string' },
  },
} as const;

const paymentAdviceBody = {
  type: 'object',
  required: ['lines'],
  additionalProperties: false,
  properties: {
    bankAccountId: { type: 'string' },
    lines: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['amountSatang'],
        properties: {
          reference: { type: 'string' },
          amountSatang: { type: 'string' },
          invoiceNumber: { type: 'string' },
        },
      },
    },
  },
} as const;

const closingTaskBody = {
  type: 'object',
  required: ['period', 'taskName', 'taskType'],
  additionalProperties: false,
  properties: {
    period: { type: 'string' },
    taskName: { type: 'string', minLength: 1 },
    taskType: { type: 'string', minLength: 1 },
    sequence: { type: 'integer', minimum: 0 },
  },
} as const;

const listQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function fiGapRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // =========================================================================
  // 1. Asset Under Construction (AuC) — Capitalize
  // =========================================================================

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/fixed-assets/:id/capitalize`,
    {
      schema: { description: 'Capitalize asset under construction', tags: ['fixed-assets'], security: [{ bearerAuth: [] }], body: capitalizeBody },
      preHandler: [requireAuth, requirePermission(FI_ASSET_CAPITALIZE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { id } = request.params;
      const { capitalizationDate } = request.body as any;

      const assets = await fastify.sql`
        SELECT * FROM fixed_assets WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      if (assets.length === 0) throw new NotFoundError({ detail: 'Asset not found' });
      const asset = assets[0]!;

      if (!asset['is_under_construction']) {
        throw new ValidationError({ detail: 'Asset is not under construction' });
      }

      const capDate = capitalizationDate ?? new Date().toISOString().slice(0, 10);

      await fastify.sql`
        UPDATE fixed_assets
        SET is_under_construction = false,
            capitalization_date = ${capDate},
            status = 'active',
            updated_at = now()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      return reply.send({ id, status: 'active', capitalizationDate: capDate, message: 'Asset capitalized — depreciation will start from this date' });
    },
  );

  // =========================================================================
  // 2. MT940 Bank Statement Import
  // =========================================================================

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/bank/:id/import-mt940`,
    {
      schema: { description: 'Import MT940 bank statement', tags: ['bank'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(FI_BANK_IMPORT_MT940)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user;
      const { id: bankAccountId } = request.params;

      // Verify bank account exists
      const banks = await fastify.sql`
        SELECT * FROM bank_accounts WHERE id = ${bankAccountId} AND tenant_id = ${tenantId}
      `;
      if (banks.length === 0) throw new NotFoundError({ detail: 'Bank account not found' });

      const file = await (request as any).file();
      if (!file) throw new ValidationError({ detail: 'MT940 file required' });

      const buffer = await file.toBuffer();
      const content = buffer.toString('utf-8');

      // Parse MT940 format
      const transactions: any[] = [];
      const lines = content.split('\n');
      let currentRef = '';
      let openingBalance = '';
      let closingBalance = '';

      for (const line of lines) {
        if (line.startsWith(':20:')) {
          currentRef = line.slice(4).trim();
        } else if (line.startsWith(':60F:')) {
          openingBalance = line.slice(5).trim();
        } else if (line.startsWith(':61:')) {
          // Parse statement line: date(6) + date(4) + D/C + amount + type + ref
          const raw = line.slice(4).trim();
          const dateStr = raw.slice(0, 6);
          const dcIndicator = raw.charAt(10) === 'D' ? 'debit' : 'credit';
          // Simplified amount extraction
          const amountMatch = raw.match(/[DC](\d+[,.]?\d*)/);
          const amountStr = amountMatch ? amountMatch[1].replace(',', '.') : '0';
          const amountSatang = Math.round(parseFloat(amountStr) * 100);

          transactions.push({
            date: `20${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`,
            type: dcIndicator,
            amountSatang,
            reference: currentRef,
          });
        } else if (line.startsWith(':62F:')) {
          closingBalance = line.slice(5).trim();
        }
      }

      // Insert bank transactions
      let imported = 0;
      for (const tx of transactions) {
        const txId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO bank_transactions (id, bank_account_id, transaction_date, description, amount_satang, type, reference, status, tenant_id, created_by)
          VALUES (${txId}, ${bankAccountId}, ${tx.date}, ${'MT940: ' + tx.reference}, ${tx.amountSatang.toString()}::bigint, ${tx.type}, ${tx.reference}, 'unmatched', ${tenantId}, ${userId})
        `;
        imported++;
      }

      return reply.status(201).send({
        bankAccountId,
        transactionsImported: imported,
        openingBalance,
        closingBalance,
        reference: currentRef,
      });
    },
  );

  // =========================================================================
  // 3. Vendor Evaluation Scorecard
  // =========================================================================

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/vendors/:id/evaluate`,
    {
      schema: { description: 'Submit vendor evaluation scorecard', tags: ['ap'], security: [{ bearerAuth: [] }], body: vendorEvalBody },
      preHandler: [requireAuth, requirePermission(AP_VENDOR_EVALUATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user;
      const { id: vendorId } = request.params;
      const { period, deliveryScore, qualityScore, priceScore, serviceScore, notes } = request.body as any;

      const overallScore = ((deliveryScore + qualityScore + priceScore + serviceScore) / 4).toFixed(2);
      const evalId = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO vendor_evaluations (id, vendor_id, period, delivery_score, quality_score, price_score, service_score, overall_score, evaluator_id, notes, tenant_id)
        VALUES (${evalId}, ${vendorId}, ${period}, ${deliveryScore}, ${qualityScore}, ${priceScore}, ${serviceScore}, ${overallScore}, ${userId}, ${notes ?? null}, ${tenantId})
      `;

      return reply.status(201).send({ id: evalId, vendorId, period, deliveryScore, qualityScore, priceScore, serviceScore, overallScore: parseFloat(overallScore) });
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/vendors/:id/scorecard`,
    {
      schema: { description: 'Get vendor scorecard history', tags: ['ap'], security: [{ bearerAuth: [] }], querystring: listQuery },
      preHandler: [requireAuth, requirePermission(AP_VENDOR_EVALUATE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { id: vendorId } = request.params;
      const { limit = 50, offset = 0 } = request.query as any;

      const rows = await fastify.sql`
        SELECT * FROM vendor_evaluations
        WHERE vendor_id = ${vendorId} AND tenant_id = ${tenantId}
        ORDER BY period DESC LIMIT ${limit} OFFSET ${offset}
      `;

      // Calculate averages
      const avgRow = await fastify.sql`
        SELECT AVG(delivery_score) AS avg_delivery, AVG(quality_score) AS avg_quality,
               AVG(price_score) AS avg_price, AVG(service_score) AS avg_service,
               AVG(overall_score) AS avg_overall
        FROM vendor_evaluations
        WHERE vendor_id = ${vendorId} AND tenant_id = ${tenantId}
      `;

      return reply.send({ evaluations: rows, averages: avgRow[0] ?? {} });
    },
  );

  // =========================================================================
  // 4. Interest on Overdue
  // =========================================================================

  fastify.post(
    `${API_V1_PREFIX}/ar/interest-calculation/run`,
    {
      schema: { description: 'Calculate interest on overdue invoices', tags: ['ar'], security: [{ bearerAuth: [] }], body: interestCalcBody },
      preHandler: [requireAuth, requirePermission(AR_INTEREST_RUN)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user;
      const { annualRateBp = 750, asOfDate } = request.body as any;
      const refDate = asOfDate ?? new Date().toISOString().slice(0, 10);

      // Find overdue invoices
      const overdueInvoices = await fastify.sql`
        SELECT id, invoice_number, customer_id, total_satang, paid_satang, due_date
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND status IN ('posted', 'sent', 'overdue', 'partial')
          AND due_date < ${refDate}
          AND (total_satang - COALESCE(paid_satang, 0)) > 0
      `;

      const results = [];
      for (const inv of overdueInvoices) {
        const outstandingSatang = BigInt(inv['total_satang'] as string) - BigInt((inv['paid_satang'] as string) ?? 0);
        const daysOverdue = Math.floor((new Date(refDate).getTime() - new Date(inv['due_date'] as string).getTime()) / 86400000);
        // Interest = outstanding * rate/10000 * days/365
        const interestSatang = outstandingSatang * BigInt(annualRateBp) * BigInt(daysOverdue) / (10000n * 365n);
        const invNumber = inv['invoice_number'] as string;

        if (interestSatang > 0n) {
          // Create interest debit note as JE
          const jeId = crypto.randomUUID();
          await fastify.sql`
            INSERT INTO journal_entries (id, entry_number, entry_date, description, status, tenant_id, created_by)
            VALUES (${jeId}, ${'INT-' + invNumber}, ${refDate}, ${'Interest on overdue invoice ' + invNumber}, 'posted', ${tenantId}, ${userId})
          `;

          results.push({
            invoiceId: inv['id'],
            invoiceNumber: invNumber,
            customerId: inv['customer_id'],
            outstandingSatang: outstandingSatang.toString(),
            daysOverdue,
            interestSatang: interestSatang.toString(),
            journalEntryId: jeId,
          });
        }
      }

      return reply.status(201).send({ asOfDate: refDate, annualRateBp, debitNotes: results });
    },
  );

  // =========================================================================
  // 5. Dispute Management (AR)
  // =========================================================================

  fastify.post(
    `${API_V1_PREFIX}/ar/disputes`,
    {
      schema: { description: 'Create AR dispute', tags: ['ar'], security: [{ bearerAuth: [] }], body: disputeCreateBody },
      preHandler: [requireAuth, requirePermission(AR_DISPUTE_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user;
      const { invoiceId, customerId, disputeType, amountSatang, notes } = request.body as any;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO ar_disputes (id, invoice_id, customer_id, dispute_type, amount_satang, notes, tenant_id, created_by)
        VALUES (${id}, ${invoiceId}, ${customerId}, ${disputeType}, ${amountSatang}::bigint, ${notes ?? null}, ${tenantId}, ${userId})
      `;

      return reply.status(201).send({ id, invoiceId, customerId, disputeType, amountSatang, status: 'open' });
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/ar/disputes`,
    {
      schema: { description: 'List AR disputes', tags: ['ar'], security: [{ bearerAuth: [] }], querystring: listQuery },
      preHandler: [requireAuth, requirePermission(AR_DISPUTE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { limit = 50, offset = 0, status } = request.query as any;

      const rows = status
        ? await fastify.sql`SELECT * FROM ar_disputes WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
        : await fastify.sql`SELECT * FROM ar_disputes WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      return reply.send({ data: rows });
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/ar/disputes/:id`,
    {
      schema: { description: 'Get dispute detail', tags: ['ar'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(AR_DISPUTE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const rows = await fastify.sql`
        SELECT * FROM ar_disputes WHERE id = ${request.params.id} AND tenant_id = ${tenantId}
      `;
      if (rows.length === 0) throw new NotFoundError({ detail: 'Dispute not found' });
      return reply.send(rows[0]);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/ar/disputes/:id/resolve`,
    {
      schema: { description: 'Resolve AR dispute', tags: ['ar'], security: [{ bearerAuth: [] }], body: disputeResolveBody },
      preHandler: [requireAuth, requirePermission(AR_DISPUTE_RESOLVE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { id } = request.params;
      const { resolution, creditNoteId } = request.body as any;

      const result = await fastify.sql`
        UPDATE ar_disputes
        SET status = 'resolved', resolution = ${resolution}, credit_note_id = ${creditNoteId ?? null}, updated_at = now()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status IN ('open', 'in_progress')
        RETURNING *
      `;
      if (result.length === 0) throw new NotFoundError({ detail: 'Dispute not found or already resolved' });
      return reply.send(result[0]);
    },
  );

  // =========================================================================
  // 6. Payment Advice Processing
  // =========================================================================

  fastify.post(
    `${API_V1_PREFIX}/ar/payment-advice`,
    {
      schema: { description: 'Process payment advice — match to open invoices', tags: ['ar'], security: [{ bearerAuth: [] }], body: paymentAdviceBody },
      preHandler: [requireAuth, requirePermission(AR_PAYMENT_ADVICE_PROCESS)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { lines } = request.body as any;

      const matches = [];
      for (const line of lines) {
        // Try to match by invoice number
        let matched = null;
        if (line.invoiceNumber) {
          const inv = await fastify.sql`
            SELECT id, invoice_number, total_satang, paid_satang
            FROM invoices
            WHERE tenant_id = ${tenantId} AND invoice_number = ${line.invoiceNumber}
              AND status IN ('posted', 'sent', 'overdue', 'partial')
            LIMIT 1
          `;
          if (inv.length > 0) matched = inv[0];
        }

        // Fallback: match by amount
        if (!matched && line.amountSatang) {
          const inv = await fastify.sql`
            SELECT id, invoice_number, total_satang, paid_satang
            FROM invoices
            WHERE tenant_id = ${tenantId}
              AND (total_satang - COALESCE(paid_satang, 0)) = ${line.amountSatang}::bigint
              AND status IN ('posted', 'sent', 'overdue', 'partial')
            LIMIT 1
          `;
          if (inv.length > 0) matched = inv[0];
        }

        matches.push({
          reference: line.reference,
          amountSatang: line.amountSatang,
          invoiceNumber: line.invoiceNumber,
          matchedInvoiceId: matched?.['id'] ?? null,
          matchedInvoiceNumber: matched?.['invoice_number'] ?? null,
          matchStatus: matched ? 'matched' : 'unmatched',
        });
      }

      const matchedCount = matches.filter((m) => m.matchStatus === 'matched').length;
      return reply.send({ totalLines: lines.length, matched: matchedCount, unmatched: lines.length - matchedCount, proposals: matches });
    },
  );

  // =========================================================================
  // 11. Profit Center Balance Sheet (report enhancement)
  // =========================================================================
  // This is handled in the existing reports route via query param — no new route needed.
  // The report route already supports ?profitCenterId= filter.

  // =========================================================================
  // 12. Contribution Margin (multi-level)
  // =========================================================================

  fastify.get(
    `${API_V1_PREFIX}/reports/contribution-margin`,
    {
      schema: {
        description: 'Multi-level contribution margin report',
        tags: ['reports'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            dimension: { type: 'string', enum: ['product', 'customer', 'channel'], default: 'product' },
            periodFrom: { type: 'string', format: 'date' },
            periodTo: { type: 'string', format: 'date' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(REPORT_CONTRIBUTION_MARGIN_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { dimension = 'product', periodFrom: _pf, periodTo: _pt } = request.query as any;

      // Simplified: aggregate from invoice lines and cost data
      const revenue = await fastify.sql`
        SELECT COALESCE(SUM(total_satang), 0) AS total_revenue
        FROM invoices
        WHERE tenant_id = ${tenantId} AND status IN ('posted', 'sent', 'paid', 'partial')
      `;

      const cogs = await fastify.sql`
        SELECT COALESCE(SUM(total_standard_cost_satang), 0) AS total_cogs
        FROM standard_costs WHERE tenant_id = ${tenantId}
      `;

      const totalRevenue = BigInt(revenue[0]?.['total_revenue'] ?? 0);
      const totalCogs = BigInt(cogs[0]?.['total_cogs'] ?? 0);
      const grossMargin = totalRevenue - totalCogs;

      // Direct costs from cost centers (simplified)
      const directCosts = await fastify.sql`
        SELECT COALESCE(SUM(jel.debit_satang), 0) AS total_direct
        FROM journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = ${tenantId}
        WHERE jel.cost_center_id IS NOT NULL
      `;
      const totalDirect = BigInt(directCosts[0]?.['total_direct'] ?? 0);
      const contributionMargin = grossMargin - totalDirect;

      // Overhead from internal orders
      const overhead = await fastify.sql`
        SELECT COALESCE(SUM(actual_satang), 0) AS total_overhead
        FROM internal_orders WHERE tenant_id = ${tenantId} AND order_type = 'overhead'
      `;
      const totalOverhead = BigInt(overhead[0]?.['total_overhead'] ?? 0);
      const netMargin = contributionMargin - totalOverhead;

      return reply.send({
        dimension,
        levels: [
          { level: 1, name: 'Gross Margin', revenueSatang: totalRevenue.toString(), cogsSatang: totalCogs.toString(), marginSatang: grossMargin.toString() },
          { level: 2, name: 'Contribution Margin', directCostsSatang: totalDirect.toString(), marginSatang: contributionMargin.toString() },
          { level: 3, name: 'Net Margin', overheadSatang: totalOverhead.toString(), marginSatang: netMargin.toString() },
        ],
      });
    },
  );

  // =========================================================================
  // 15. Financial Closing Cockpit
  // =========================================================================

  fastify.get(
    `${API_V1_PREFIX}/month-end/cockpit`,
    {
      schema: {
        description: 'Get closing cockpit tasks for a period',
        tags: ['gl'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', description: 'YYYY-MM' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_CLOSING_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { period } = request.query as any;

      const whereClause = period
        ? fastify.sql`AND period = ${period}`
        : fastify.sql``;

      const rows = await fastify.sql`
        SELECT * FROM closing_tasks
        WHERE tenant_id = ${tenantId} ${whereClause}
        ORDER BY period DESC, sequence ASC
      `;

      // Summary
      const total = rows.length;
      const completed = rows.filter((r: any) => r.status === 'completed').length;
      const pending = rows.filter((r: any) => r.status === 'pending').length;

      return reply.send({ total, completed, pending, progress: total > 0 ? Math.round((completed / total) * 100) : 0, tasks: rows });
    },
  );

  fastify.post(
    `${API_V1_PREFIX}/month-end/cockpit`,
    {
      schema: { description: 'Create closing cockpit task', tags: ['gl'], security: [{ bearerAuth: [] }], body: closingTaskBody },
      preHandler: [requireAuth, requirePermission(FI_CLOSING_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { period, taskName, taskType, sequence } = request.body as any;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO closing_tasks (id, period, task_name, task_type, sequence, tenant_id)
        VALUES (${id}, ${period}, ${taskName}, ${taskType}, ${sequence ?? 0}, ${tenantId})
      `;

      return reply.status(201).send({ id, period, taskName, taskType, sequence: sequence ?? 0, status: 'pending' });
    },
  );

  fastify.post<{ Params: { taskId: string } }>(
    `${API_V1_PREFIX}/month-end/cockpit/:taskId/complete`,
    {
      schema: { description: 'Complete a closing cockpit task', tags: ['gl'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(FI_CLOSING_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user;
      const { taskId } = request.params;

      const result = await fastify.sql`
        UPDATE closing_tasks
        SET status = 'completed', completed_by = ${userId}, completed_at = now(), updated_at = now()
        WHERE id = ${taskId} AND tenant_id = ${tenantId} AND status IN ('pending', 'in_progress')
        RETURNING *
      `;
      if (result.length === 0) throw new NotFoundError({ detail: 'Closing task not found or already completed' });
      return reply.send(result[0]);
    },
  );
}
