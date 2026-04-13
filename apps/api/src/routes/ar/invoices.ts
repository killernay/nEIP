/**
 * Invoice routes:
 *   POST /api/v1/invoices          — create invoice
 *   GET  /api/v1/invoices          — list invoices
 *   GET  /api/v1/invoices/:id      — get invoice detail
 *   POST /api/v1/invoices/:id/void — void invoice
 *
 * Story 4.5b — AR API Routes (Invoices + Payments)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_INVOICE_CREATE,
  AR_INVOICE_READ,
  AR_INVOICE_VOID,
  FI_ETAX_READ,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// Thai VAT rate: 7% expressed in basis points (700 = 7%)
const VAT_RATE_BASIS_POINTS = 700n;

/** Compute VAT amount (round half up) using bigint arithmetic. */
function calcVat(subTotalSatang: bigint): bigint {
  // subTotal * 700 / 10000, round half up
  const scaled = subTotalSatang * VAT_RATE_BASIS_POINTS;
  const quotient = scaled / 10000n;
  const remainder = scaled % 10000n;
  return remainder * 2n >= 10000n ? quotient + 1n : quotient;
}

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const invoiceLineSchema = {
  type: 'object',
  required: ['description', 'quantity', 'unitPriceSatang'],
  additionalProperties: false,
  properties: {
    description: { type: 'string', minLength: 1, maxLength: 500 },
    quantity: { type: 'integer', minimum: 1, description: 'Quantity as integer (whole units)' },
    unitPriceSatang: { type: 'string', description: 'Unit price in satang' },
    accountId: { type: 'string', description: 'Revenue account ID' },
    productId: { type: 'string', description: 'Product ID — used to determine VAT category' },
  },
} as const;

const createInvoiceBodySchema = {
  type: 'object',
  required: ['customerId', 'dueDate', 'lines'],
  additionalProperties: false,
  properties: {
    customerId: { type: 'string', description: 'Customer ID' },
    dueDate: { type: 'string', format: 'date', description: 'Payment due date (YYYY-MM-DD)' },
    notes: { type: 'string', maxLength: 2000 },
    lines: {
      type: 'array',
      minItems: 1,
      items: invoiceLineSchema,
    },
  },
} as const;

const invoiceResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    invoiceNumber: { type: 'string' },
    customerId: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'posted', 'sent', 'paid', 'partial', 'overdue', 'void'] },
    totalSatang: { type: 'string' },
    paidSatang: { type: 'string' },
    subTotalSatang: { type: 'string' },
    vatRateBasisPoints: { type: 'integer' },
    vatAmountSatang: { type: 'string' },
    grandTotalSatang: { type: 'string' },
    dueDate: { type: 'string', format: 'date' },
    notes: { type: 'string', nullable: true },
    postedAt: { type: 'string', nullable: true },
    journalEntryId: { type: 'string', nullable: true },
    lines: { type: 'array', items: { type: 'object' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: { type: 'string', enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'void'] },
    customerId: { type: 'string' },
    sortBy: { type: 'string', enum: ['createdAt', 'dueDate', 'totalSatang'], default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateInvoiceBody {
  customerId: string;
  dueDate: string;
  notes?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPriceSatang: string;
    accountId?: string;
    productId?: string;
  }>;
}

interface InvoiceListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  customerId?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface IdParams {
  id: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  status: string;
  total_satang: bigint;
  paid_satang: bigint;
  due_date: string;
  notes: string | null;
  tenant_id: string;
  created_by: string;
  posted_at: Date | string | null;
  journal_entry_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function buildInvoiceResponse(inv: InvoiceRow, lines: unknown[]) {
  const subTotal = BigInt(inv.total_satang);
  const vatAmount = calcVat(subTotal);
  const grandTotal = subTotal + vatAmount;
  return {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    customerId: inv.customer_id,
    status: inv.status,
    totalSatang: inv.total_satang.toString(),
    paidSatang: inv.paid_satang.toString(),
    subTotalSatang: subTotal.toString(),
    vatRateBasisPoints: Number(VAT_RATE_BASIS_POINTS),
    vatAmountSatang: vatAmount.toString(),
    grandTotalSatang: grandTotal.toString(),
    dueDate: inv.due_date,
    notes: inv.notes,
    postedAt: inv.posted_at ? toISO(inv.posted_at) : null,
    journalEntryId: inv.journal_entry_id ?? null,
    lines,
    createdAt: toISO(inv.created_at),
    updatedAt: toISO(inv.updated_at),
  };
}

interface InvoiceLineRow {
  id: string;
  invoice_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price_satang: bigint;
  total_satang: bigint;
  account_id: string | null;
}

interface CountRow {
  count: string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function invoiceRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/invoices — create invoice
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateInvoiceBody }>(
    `${API_V1_PREFIX}/invoices`,
    {
      schema: {
        description: 'Create a new invoice',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: createInvoiceBodySchema,
        response: { 201: { description: 'Invoice created', ...invoiceResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_INVOICE_CREATE)],
    },
    async (request, reply) => {
      const { customerId, dueDate, notes, lines } = request.body;
      const { tenantId, sub: userId } = request.user;

      // Validate customer belongs to this tenant
      if (customerId) {
        const customerCheck = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM contacts WHERE id = ${customerId} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!customerCheck[0]) {
          throw new NotFoundError({ detail: `Customer ${customerId} not found.` });
        }
      }

      // Look up VAT categories for products referenced in lines
      const productIds = lines.map(l => l.productId).filter(Boolean) as string[];
      const productVatMap: Record<string, string> = {};
      if (productIds.length > 0) {
        const products = await fastify.sql<{ id: string; vat_category: string }[]>`
          SELECT id, COALESCE(vat_category, 'standard') as vat_category
          FROM products WHERE id = ANY(${productIds}) AND tenant_id = ${tenantId}
        `;
        for (const p of products) {
          productVatMap[p.id] = p.vat_category;
        }
      }

      // Map vat_category → vat_code
      function vatCategoryToCode(cat: string): string {
        switch (cat) {
          case 'exempt': return 'VX';
          case 'zero_rated': return 'V0';
          case 'out_of_scope': return 'VO';
          default: return 'V7';
        }
      }

      // Calculate total with per-line VAT
      let totalSatang = 0n;
      let totalVatSatang = 0n;
      const processedLines = lines.map((line, index) => {
        // M-1 FIX: quantity is integer — no float precision loss
        const lineTotal = BigInt(line.unitPriceSatang) * BigInt(line.quantity);
        totalSatang += lineTotal;

        const vatCategory = line.productId ? (productVatMap[line.productId] ?? 'standard') : 'standard';
        const vatCode = vatCategoryToCode(vatCategory);
        const lineVat = vatCode === 'V7' ? calcVat(lineTotal) : 0n;
        totalVatSatang += lineVat;

        return {
          id: crypto.randomUUID(),
          lineNumber: index + 1,
          description: line.description,
          quantity: line.quantity,
          unitPriceSatang: line.unitPriceSatang,
          totalSatang: lineTotal.toString(),
          accountId: line.accountId ?? null,
          productId: line.productId ?? null,
          vatCode,
          vatAmountSatang: lineVat.toString(),
        };
      });

      // Validate total > 0
      if (totalSatang === 0n) {
        throw new ValidationError({ detail: 'Invoice total must be > 0 satang.' });
      }

      const invoiceId = crypto.randomUUID();
      const fiscalYear = new Date().getFullYear();
      const invoiceNumber = await nextDocNumber(fastify.sql, tenantId, 'invoice', fiscalYear);

      await fastify.sql`
        INSERT INTO invoices (id, invoice_number, customer_id, status, total_satang, paid_satang, due_date, notes, tenant_id, created_by)
        VALUES (${invoiceId}, ${invoiceNumber}, ${customerId}, 'draft', ${totalSatang.toString()}::bigint, 0, ${dueDate}, ${notes ?? null}, ${tenantId}, ${userId})
      `;

      // Insert line items with per-line VAT.
      for (const line of processedLines) {
        await fastify.sql`
          INSERT INTO invoice_line_items (id, invoice_id, line_number, description, quantity, unit_price_satang, total_satang, account_id, vat_code, vat_amount_satang)
          VALUES (${line.id}, ${invoiceId}, ${line.lineNumber}, ${line.description}, ${line.quantity}, ${line.unitPriceSatang}::bigint, ${line.totalSatang}::bigint, ${line.accountId}, ${line.vatCode}, ${line.vatAmountSatang}::bigint)
        `;
      }

      request.log.info(
        { invoiceId, invoiceNumber, customerId, tenantId, userId },
        'Invoice created',
      );

      const grandTotal = totalSatang + totalVatSatang;

      return reply.status(201).send({
        id: invoiceId,
        invoiceNumber,
        customerId,
        status: 'draft',
        totalSatang: totalSatang.toString(),
        paidSatang: '0',
        subTotalSatang: totalSatang.toString(),
        vatRateBasisPoints: Number(VAT_RATE_BASIS_POINTS),
        vatAmountSatang: totalVatSatang.toString(),
        grandTotalSatang: grandTotal.toString(),
        dueDate,
        notes: notes ?? null,
        postedAt: null,
        journalEntryId: null,
        lines: processedLines,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/invoices — list invoices
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: InvoiceListQuery }>(
    `${API_V1_PREFIX}/invoices`,
    {
      schema: {
        description: 'List invoices with pagination and filtering',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            description: 'Paginated list of invoices',
            type: 'object',
            properties: {
              items: { type: 'array', items: invoiceResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_INVOICE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status, customerId } = request.query;

      let countRows: CountRow[];
      let invoices: InvoiceRow[];

      if (status !== undefined && customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM invoices WHERE tenant_id = ${tenantId} AND status = ${status} AND customer_id = ${customerId}
        `;
        invoices = await fastify.sql<InvoiceRow[]>`
          SELECT * FROM invoices WHERE tenant_id = ${tenantId} AND status = ${status} AND customer_id = ${customerId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM invoices WHERE tenant_id = ${tenantId} AND status = ${status}
        `;
        invoices = await fastify.sql<InvoiceRow[]>`
          SELECT * FROM invoices WHERE tenant_id = ${tenantId} AND status = ${status}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM invoices WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
        `;
        invoices = await fastify.sql<InvoiceRow[]>`
          SELECT * FROM invoices WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM invoices WHERE tenant_id = ${tenantId}
        `;
        invoices = await fastify.sql<InvoiceRow[]>`
          SELECT * FROM invoices WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);

      const items = invoices.map((inv) => buildInvoiceResponse(inv, []));

      return reply.status(200).send({ items, total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/invoices/:id — get invoice detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/invoices/:id`,
    {
      schema: {
        description: 'Get invoice details by ID',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Invoice details', ...invoiceResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_INVOICE_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[InvoiceRow?]>`
        SELECT * FROM invoices WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const inv = rows[0];
      if (!inv) {
        throw new NotFoundError({ detail: `Invoice ${id} not found.` });
      }

      const lines = await fastify.sql<InvoiceLineRow[]>`
        SELECT * FROM invoice_line_items WHERE invoice_id = ${id} ORDER BY line_number
      `;

      const mappedLines = lines.map((l) => ({
        id: l.id,
        lineNumber: l.line_number,
        description: l.description,
        quantity: l.quantity,
        unitPriceSatang: l.unit_price_satang.toString(),
        totalSatang: l.total_satang.toString(),
        accountId: l.account_id,
      }));

      return reply.status(200).send(buildInvoiceResponse(inv, mappedLines));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/invoices/:id/post — post invoice (draft → posted, creates JE)
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/invoices/:id/post`,
    {
      schema: {
        description: 'Post an invoice — changes status from draft to posted and creates a Journal Entry (Dr AR / Cr Revenue)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Invoice posted', ...invoiceResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_INVOICE_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<[InvoiceRow?]>`
        SELECT * FROM invoices WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const inv = rows[0];
      if (!inv) {
        throw new NotFoundError({ detail: `Invoice ${id} not found.` });
      }
      if (inv.status !== 'draft') {
        throw new ConflictError({
          detail: `Invoice ${id} cannot be posted — current status is "${inv.status}". Only draft invoices can be posted.`,
        });
      }

      // Fetch line items to create JE lines per revenue account
      const lines = await fastify.sql<InvoiceLineRow[]>`
        SELECT * FROM invoice_line_items WHERE invoice_id = ${id} ORDER BY line_number
      `;

      // Look up AR account (TFAC code 1200/1210), Revenue account,
      // and VAT Payable account (TFAC code 2210) for this tenant
      const arAccounts = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND (code LIKE '1200%' OR code LIKE '1210%') AND account_type = 'asset'
        ORDER BY code ASC LIMIT 1
      `;
      const revAccounts = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND account_type = 'revenue'
        ORDER BY code ASC LIMIT 1
      `;
      const vatPayableAccounts = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND code LIKE '2210%' AND account_type = 'liability'
        ORDER BY code ASC LIMIT 1
      `;

      const arAccountId = arAccounts[0]?.id ?? null;
      const revAccountId = revAccounts[0]?.id ?? null;
      const vatPayableAccountId = vatPayableAccounts[0]?.id ?? null;

      // C-1 FIX: Validate ALL required accounts exist before creating JE
      if (!arAccountId) {
        throw new ValidationError({
          detail: 'Cannot post: Accounts Receivable account (code 1200*/1210*) not found in Chart of Accounts.',
        });
      }
      if (!revAccountId) {
        // Check if all lines have explicit accountId
        const missingAccount = lines.some((l) => !l.account_id);
        if (missingAccount) {
          throw new ValidationError({
            detail: 'Cannot post: Revenue account not found in Chart of Accounts and not all invoice lines have an explicit account.',
          });
        }
      }
      if (!vatPayableAccountId) {
        throw new ValidationError({
          detail: 'Cannot post: VAT Payable account (code 2210*) not found in Chart of Accounts.',
        });
      }

      // Create Journal Entry: Dr AR (grandTotal), Cr Revenue per line (subTotal), Cr VAT Payable (vatAmount)
      const jeId = crypto.randomUUID();
      const now = new Date();
      const fiscalYear = now.getFullYear();
      const jeNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);
      const fiscalPeriod = now.getMonth() + 1;
      const subTotalSatang = BigInt(inv.total_satang);
      const vatAmountSatang = calcVat(subTotalSatang);
      const grandTotalSatang = subTotalSatang + vatAmountSatang;

      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at)
        VALUES (
          ${jeId}, ${jeNumber},
          ${'Invoice posted: ' + inv.invoice_number},
          'posted', ${fiscalYear}, ${fiscalPeriod},
          ${tenantId}, ${userId}, NOW()
        )
      `;

      // Dr AR (grandTotal = subTotal + VAT)
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
        VALUES (
          ${crypto.randomUUID()}, ${jeId}, 1,
          ${arAccountId},
          ${'Accounts Receivable — ' + inv.invoice_number},
          ${grandTotalSatang.toString()}::bigint, 0
        )
      `;

      // Cr Revenue — one line per invoice line item (subTotal breakdown)
      let lineNum = 2;
      for (const line of lines) {
        const accountId = line.account_id ?? revAccountId;
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
          VALUES (
            ${crypto.randomUUID()}, ${jeId}, ${lineNum},
            ${accountId},
            ${line.description},
            0, ${BigInt(line.total_satang).toString()}::bigint
          )
        `;
        lineNum++;
      }

      // Cr VAT Payable (7% VAT on subTotal)
      if (vatAmountSatang > 0n) {
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
          VALUES (
            ${crypto.randomUUID()}, ${jeId}, ${lineNum},
            ${vatPayableAccountId},
            ${'VAT Payable 7% — ' + inv.invoice_number},
            0, ${vatAmountSatang.toString()}::bigint
          )
        `;
      }

      // Update invoice: draft → posted
      const updatedRows = await fastify.sql<[InvoiceRow?]>`
        UPDATE invoices
        SET status = 'posted', posted_at = NOW(), journal_entry_id = ${jeId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;

      const updated = updatedRows[0];
      if (!updated) {
        throw new NotFoundError({ detail: `Invoice ${id} not found after update.` });
      }

      request.log.info({ invoiceId: id, jeId, tenantId }, 'Invoice posted with JE');

      const mappedLines = lines.map((l) => ({
        id: l.id,
        lineNumber: l.line_number,
        description: l.description,
        quantity: l.quantity,
        unitPriceSatang: l.unit_price_satang.toString(),
        totalSatang: l.total_satang.toString(),
        accountId: l.account_id,
      }));

      return reply.status(200).send(buildInvoiceResponse(updated, mappedLines));
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/invoices/:id/void — void invoice
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/invoices/:id/void`,
    {
      schema: {
        description: 'Void an invoice (cannot be undone)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Invoice voided', ...invoiceResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_INVOICE_VOID)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      // Check for existing payments — cannot void an invoice that has payments
      const paymentCheck = await fastify.sql<[{ count: string }?]>`
        SELECT count(*)::text as count FROM invoice_payments ip
        JOIN ar_payments ap ON ap.id = ip.payment_id
        WHERE ip.invoice_id = ${id} AND ap.status != 'voided'
      `;
      const paymentCount = parseInt(paymentCheck[0]?.count ?? '0', 10);
      if (paymentCount > 0) {
        throw new ConflictError({
          detail: 'Invoice has been partially or fully paid. Void the payments first.',
        });
      }

      const rows = await fastify.sql<[InvoiceRow?]>`
        UPDATE invoices
        SET status = 'void', updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status IN ('draft', 'sent', 'posted')
        RETURNING *
      `;
      const inv = rows[0];
      if (!inv) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM invoices WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) {
          throw new NotFoundError({ detail: `Invoice ${id} not found.` });
        }
        throw new ValidationError({
          detail: `Invoice ${id} cannot be voided — current status is "${existing[0].status}".`,
        });
      }

      // H-4 FIX: If invoice has a posted JE, create a reversal JE
      if (inv.journal_entry_id) {
        const { sub: userId } = request.user;

        // Get original JE lines
        const jeLineRows = await fastify.sql<Array<{ line_number: number; account_id: string; description: string | null; debit_satang: string; credit_satang: string }>>`
          SELECT line_number, account_id, description, debit_satang::text, credit_satang::text
          FROM journal_entry_lines WHERE entry_id = ${inv.journal_entry_id}
        `;

        // Get original JE for fiscal info
        const origJeRows = await fastify.sql<[{ document_number: string; fiscal_year: number; fiscal_period: number }?]>`
          SELECT document_number, fiscal_year, fiscal_period FROM journal_entries WHERE id = ${inv.journal_entry_id} LIMIT 1
        `;
        const origJe = origJeRows[0];

        if (origJe && jeLineRows.length > 0) {
          // Mark original JE as reversed
          await fastify.sql`
            UPDATE journal_entries SET status = 'reversed', updated_at = NOW()
            WHERE id = ${inv.journal_entry_id}
          `;

          // Create reversal JE
          const reversalJeId = crypto.randomUUID();
          const now = new Date();
          const reversalDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', origJe.fiscal_year);

          await fastify.sql`
            INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, reversed_entry_id, tenant_id, created_by, posted_at, created_at, updated_at)
            VALUES (${reversalJeId}, ${reversalDocNumber}, ${'Reversal of ' + origJe.document_number + ' (invoice void)'}, 'posted', ${origJe.fiscal_year}, ${origJe.fiscal_period}, ${inv.journal_entry_id}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
          `;

          // Create reversed lines (swap debit/credit)
          for (const line of jeLineRows) {
            await fastify.sql`
              INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
              VALUES (${crypto.randomUUID()}, ${reversalJeId}, ${line.line_number}, ${line.account_id}, ${line.description}, ${line.credit_satang}::bigint, ${line.debit_satang}::bigint, ${now.toISOString()}::timestamptz)
            `;
          }

          request.log.info({ invoiceId: id, originalJeId: inv.journal_entry_id, reversalJeId, tenantId }, 'Invoice JE reversed on void');
        }
      }

      request.log.info({ invoiceId: id, tenantId }, 'Invoice voided');

      return reply.status(200).send(buildInvoiceResponse(inv, []));
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/invoices/:id/e-tax — e-Tax Invoice (ใบกำกับภาษีอิเล็กทรอนิกส์)
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/invoices/:id/e-tax`,
    {
      schema: {
        description: 'Generate e-Tax Invoice structured data (ใบกำกับภาษี) following Thai e-Tax Invoice requirements',
        tags: ['ar', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              documentType: { type: 'string' },
              documentTypeCode: { type: 'string' },
              seller: { type: 'object' },
              buyer: { type: 'object' },
              invoice: { type: 'object' },
              generatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(FI_ETAX_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      // Fetch invoice
      const invRows = await fastify.sql<[InvoiceRow?]>`
        SELECT * FROM invoices WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const inv = invRows[0];
      if (!inv) throw new NotFoundError({ detail: `Invoice ${id} not found.` });

      if (inv.status === 'draft') {
        throw new ValidationError({ detail: 'e-Tax Invoice can only be generated for posted invoices.' });
      }

      // Fetch line items
      const lines = await fastify.sql<InvoiceLineRow[]>`
        SELECT * FROM invoice_line_items WHERE invoice_id = ${id} ORDER BY line_number
      `;

      // Fetch seller (tenant/firm) info
      interface FirmInfo {
        company_name: string | null; tax_id: string | null;
        branch_number: string | null; address: string | null;
      }
      const firmRows = await fastify.sql<[FirmInfo?]>`
        SELECT company_name, tax_id, branch_number, address
        FROM tenants WHERE id = ${tenantId} LIMIT 1
      `;
      const firm = firmRows[0];

      // Fetch buyer (customer/contact) info
      interface ContactInfo {
        company_name: string; tax_id: string | null;
        branch_number: string | null; contact_person: string | null;
        address_line1: string | null; address_line2: string | null;
        city: string | null; province: string | null;
        postal_code: string | null; country: string;
      }
      const contactRows = await fastify.sql<[ContactInfo?]>`
        SELECT company_name, tax_id, branch_number, contact_person,
               address_line1, address_line2, city, province, postal_code, country
        FROM contacts WHERE id = ${inv.customer_id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const buyer = contactRows[0];

      const subTotal = BigInt(inv.total_satang);
      const vatAmount = calcVat(subTotal);
      const grandTotal = subTotal + vatAmount;

      const eTaxItems = lines.map((l) => ({
        lineNumber: l.line_number,
        description: l.description,
        quantity: l.quantity,
        unitPriceSatang: l.unit_price_satang.toString(),
        totalSatang: l.total_satang.toString(),
      }));

      return reply.status(200).send({
        documentType: 'ใบกำกับภาษี',
        documentTypeCode: 'T02',
        seller: {
          companyName: firm?.company_name ?? tenantId,
          taxId: firm?.tax_id ?? null,
          branchNumber: firm?.branch_number ?? '00000',
          address: firm?.address ?? null,
        },
        buyer: {
          companyName: buyer?.company_name ?? null,
          taxId: buyer?.tax_id ?? null,
          branchNumber: buyer?.branch_number ?? '00000',
          contactPerson: buyer?.contact_person ?? null,
          address: buyer
            ? [buyer.address_line1, buyer.address_line2, buyer.city, buyer.province, buyer.postal_code, buyer.country]
                .filter(Boolean)
                .join(', ')
            : null,
        },
        invoice: {
          invoiceNumber: inv.invoice_number,
          invoiceDate: inv.posted_at ? toISO(inv.posted_at) : toISO(inv.created_at),
          dueDate: inv.due_date,
          items: eTaxItems,
          subTotalSatang: subTotal.toString(),
          vatRateBasisPoints: Number(VAT_RATE_BASIS_POINTS),
          vatAmountSatang: vatAmount.toString(),
          grandTotalSatang: grandTotal.toString(),
          currency: 'THB',
        },
        generatedAt: new Date().toISOString(),
      });
    },
  );
}
