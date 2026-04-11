/**
 * Payment routes:
 *   POST /api/v1/payments          — record payment
 *   GET  /api/v1/payments          — list payments
 *   POST /api/v1/payments/:id/void — void payment
 *   POST /api/v1/payments/:id/match — match payment to invoices
 *
 * Story 4.5b — AR API Routes (Invoices + Payments)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ConflictError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_PAYMENT_CREATE,
  AR_PAYMENT_READ,
  AR_PAYMENT_UPDATE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const createPaymentBodySchema = {
  type: 'object',
  required: ['amountSatang', 'paymentDate', 'paymentMethod'],
  additionalProperties: false,
  properties: {
    customerId: { type: 'string', description: 'Customer ID' },
    invoiceId: { type: 'string', description: 'Invoice to apply payment to (optional)' },
    amountSatang: { type: 'string', description: 'Payment amount in satang' },
    paymentDate: { type: 'string', format: 'date', description: 'Date of payment (YYYY-MM-DD)' },
    paymentMethod: {
      type: 'string',
      enum: ['cash', 'bank_transfer', 'cheque', 'promptpay'],
      description: 'Payment method',
    },
    reference: { type: 'string', maxLength: 255, description: 'External reference number' },
    notes: { type: 'string', maxLength: 2000 },
  },
} as const;

const paymentResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    paymentNumber: { type: 'string' },
    customerId: { type: 'string', nullable: true },
    invoiceId: { type: 'string', nullable: true },
    amountSatang: { type: 'string' },
    paymentDate: { type: 'string', format: 'date' },
    paymentMethod: { type: 'string' },
    reference: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['unmatched', 'matched', 'voided'] },
    notes: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const matchPaymentBodySchema = {
  type: 'object',
  required: ['invoiceIds'],
  additionalProperties: false,
  properties: {
    invoiceIds: {
      type: 'array',
      minItems: 1,
      items: { type: 'string' },
      description: 'Invoice IDs to match this payment against',
    },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: { type: 'string', enum: ['unmatched', 'matched', 'voided'] },
    customerId: { type: 'string' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreatePaymentBody {
  customerId?: string;
  invoiceId?: string;
  amountSatang: string;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

interface MatchPaymentBody {
  invoiceIds: string[];
}

interface PaymentListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  customerId?: string;
  sortOrder?: string;
}

interface IdParams {
  id: string;
}

interface PaymentRow {
  id: string;
  document_number: string;
  customer_id: string | null;
  amount_satang: bigint;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  status: string;
  notes: string | null;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  status: string;
  total_satang: bigint;
  paid_satang: bigint;
  tenant_id: string;
}

interface CountRow {
  count: string;
}

// ---------------------------------------------------------------------------
// Helper: update invoice status after payment changes
// ---------------------------------------------------------------------------

async function updateInvoiceAfterPayment(
  fastify: FastifyInstance,
  invoiceId: string,
  tenantId: string,
): Promise<void> {
  // Sum all non-voided payments for this invoice
  const sumRows = await fastify.sql<[{ total: string }?]>`
    SELECT COALESCE(SUM(ip.amount_satang), 0)::text as total
    FROM invoice_payments ip
    JOIN ar_payments p ON p.id = ip.payment_id
    WHERE ip.invoice_id = ${invoiceId}
      AND p.tenant_id = ${tenantId}
      AND (p.status IS NULL OR p.status != 'voided')
  `;
  const paidSatang = BigInt(sumRows[0]?.total ?? '0');

  const invRows = await fastify.sql<[InvoiceRow?]>`
    SELECT * FROM invoices WHERE id = ${invoiceId} AND tenant_id = ${tenantId} LIMIT 1
  `;
  const inv = invRows[0];
  if (!inv) return;

  const totalSatang = BigInt(inv.total_satang);
  let newStatus: string;
  if (paidSatang >= totalSatang) {
    newStatus = 'paid';
  } else if (paidSatang > 0n) {
    newStatus = 'partial';
  } else {
    newStatus = inv.status === 'paid' || inv.status === 'partial' ? 'sent' : inv.status;
  }

  await fastify.sql`
    UPDATE invoices
    SET paid_satang = ${paidSatang.toString()}::bigint, status = ${newStatus}, updated_at = NOW()
    WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
  `;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function paymentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/payments — record payment
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreatePaymentBody }>(
    `${API_V1_PREFIX}/payments`,
    {
      schema: {
        description: 'Record a new payment',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: createPaymentBodySchema,
        response: { 201: { description: 'Payment recorded', ...paymentResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_PAYMENT_CREATE)],
    },
    async (request, reply) => {
      const {
        customerId, invoiceId, amountSatang, paymentDate, paymentMethod, reference, notes,
      } = request.body;
      const { tenantId, sub: userId } = request.user;

      // Validate amount
      const amountBigInt = BigInt(amountSatang);
      if (amountBigInt <= 0n) {
        throw new ValidationError({ detail: 'Payment amount must be greater than 0 satang.' });
      }

      // If invoiceId provided, validate invoice exists and get its details
      let resolvedCustomerId = customerId ?? null;
      if (invoiceId) {
        const invRows = await fastify.sql<[InvoiceRow?]>`
          SELECT * FROM invoices WHERE id = ${invoiceId} AND tenant_id = ${tenantId} LIMIT 1
        `;
        const inv = invRows[0];
        if (!inv) {
          throw new NotFoundError({ detail: `Invoice ${invoiceId} not found.` });
        }
        if (inv.status === 'void') {
          throw new ConflictError({ detail: `Invoice ${invoiceId} is voided and cannot receive payments.` });
        }
        // Check overpayment
        const remaining = BigInt(inv.total_satang) - BigInt(inv.paid_satang);
        if (amountBigInt > remaining) {
          throw new ValidationError({
            detail: `Payment amount ${amountSatang} exceeds outstanding balance ${remaining.toString()} satang.`,
          });
        }
        resolvedCustomerId = resolvedCustomerId ?? inv.customer_id;
      }

      const paymentId = crypto.randomUUID();
      const fiscalYear = new Date().getFullYear();
      const paymentNumber = await nextDocNumber(fastify.sql, tenantId, 'payment', fiscalYear);
      const status = invoiceId ? 'matched' : 'unmatched';

      // --- Auto-create Journal Entry: Dr Cash/Bank, Cr Accounts Receivable ---
      let journalEntryId: string | null = null;
      try {
        // Look up Cash/Bank account (code starting with "1010" or "1100")
        const cashRows = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM chart_of_accounts
          WHERE tenant_id = ${tenantId} AND is_active = true
            AND (code LIKE '1010%' OR code LIKE '1100%')
            AND account_type = 'asset'
          ORDER BY code ASC LIMIT 1
        `;
        // Look up Accounts Receivable account (code starting with "1120" or "1100")
        const arRows = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM chart_of_accounts
          WHERE tenant_id = ${tenantId} AND is_active = true
            AND (code LIKE '1120%' OR code LIKE '1100%')
            AND account_type = 'asset'
          ORDER BY code DESC LIMIT 1
        `;

        const cashAccountId = cashRows[0]?.id;
        const arAccountId = arRows[0]?.id;

        if (cashAccountId && arAccountId && cashAccountId !== arAccountId) {
          const jeId = crypto.randomUUID();
          const now = new Date();
          const fiscalYear = now.getFullYear();
          const fiscalPeriod = now.getMonth() + 1;

          // Generate JE document number via sequence
          const seqRows = await fastify.sql<[{ next_val: string }?]>`
            UPDATE document_sequences
            SET current_value = current_value + 1, updated_at = NOW()
            WHERE tenant_id = ${tenantId} AND document_type = 'journal_entry' AND fiscal_year = ${fiscalYear}
            RETURNING current_value::text as next_val
          `;
          let jeDocNumber: string;
          if (seqRows[0]) {
            jeDocNumber = `JE-${fiscalYear}-${seqRows[0].next_val.padStart(6, '0')}`;
          } else {
            // Create sequence if it doesn't exist
            await fastify.sql`
              INSERT INTO document_sequences (id, tenant_id, document_type, fiscal_year, current_value, prefix, created_at, updated_at)
              VALUES (${crypto.randomUUID()}, ${tenantId}, 'journal_entry', ${fiscalYear}, 1, 'JE', NOW(), NOW())
              ON CONFLICT (tenant_id, document_type, fiscal_year) DO UPDATE SET current_value = document_sequences.current_value + 1, updated_at = NOW()
            `;
            jeDocNumber = `JE-${fiscalYear}-000001`;
          }

          // Insert journal entry header (posted immediately, like AP)
          await fastify.sql`
            INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
            VALUES (${jeId}, ${jeDocNumber}, ${'AR payment received - ' + paymentNumber}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
          `;

          // Line 1: Debit Cash/Bank
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
            VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${cashAccountId}, ${'AR payment - ' + paymentNumber}, ${amountBigInt.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
          `;

          // Line 2: Credit Accounts Receivable
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
            VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${arAccountId}, ${'AR payment - ' + paymentNumber}, 0::bigint, ${amountBigInt.toString()}::bigint, ${now.toISOString()}::timestamptz)
          `;

          journalEntryId = jeId;
        } else {
          request.log.warn(
            { tenantId, cashAccountId, arAccountId },
            'Could not find distinct Cash and AR accounts for JE creation — payment recorded without JE',
          );
        }
      } catch (jeError) {
        request.log.error({ err: jeError, tenantId }, 'Failed to create journal entry for AR payment — payment will proceed without JE');
      }

      await fastify.sql`
        INSERT INTO ar_payments (id, document_number, customer_id, amount_satang, payment_date, payment_method, reference, notes, journal_entry_id, tenant_id, created_by)
        VALUES (${paymentId}, ${paymentNumber}, ${resolvedCustomerId}, ${amountBigInt.toString()}::bigint, ${paymentDate}, ${paymentMethod}, ${reference ?? null}, ${notes ?? null}, ${journalEntryId}, ${tenantId}, ${userId})
      `;

      // Link to invoice if provided
      if (invoiceId) {
        const matchId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO invoice_payments (id, invoice_id, payment_id, amount_satang)
          VALUES (${matchId}, ${invoiceId}, ${paymentId}, ${amountBigInt.toString()}::bigint)
          ON CONFLICT (invoice_id, payment_id) DO NOTHING
        `;
        // Update invoice paid_satang and status
        await updateInvoiceAfterPayment(fastify, invoiceId, tenantId);
      }

      request.log.info(
        { paymentId, paymentNumber, journalEntryId, tenantId, userId, invoiceId },
        'Payment recorded',
      );

      return reply.status(201).send({
        id: paymentId,
        paymentNumber,
        customerId: resolvedCustomerId,
        invoiceId: invoiceId ?? null,
        amountSatang,
        paymentDate,
        paymentMethod,
        reference: reference ?? null,
        status,
        notes: notes ?? null,
        createdAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/payments — list payments
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: PaymentListQuery }>(
    `${API_V1_PREFIX}/payments`,
    {
      schema: {
        description: 'List payments with pagination',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            description: 'Paginated list of payments',
            type: 'object',
            properties: {
              items: { type: 'array', items: paymentResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_PAYMENT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status, customerId } = request.query;

      let countRows: CountRow[];
      let payments: PaymentRow[];

      if (status !== undefined && customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM ar_payments WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} AND status = ${status}
        `;
        payments = await fastify.sql<PaymentRow[]>`
          SELECT * FROM ar_payments WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} AND status = ${status}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM ar_payments WHERE tenant_id = ${tenantId} AND status = ${status}
        `;
        payments = await fastify.sql<PaymentRow[]>`
          SELECT * FROM ar_payments WHERE tenant_id = ${tenantId} AND status = ${status}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM ar_payments WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
        `;
        payments = await fastify.sql<PaymentRow[]>`
          SELECT * FROM ar_payments WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM ar_payments WHERE tenant_id = ${tenantId}
        `;
        payments = await fastify.sql<PaymentRow[]>`
          SELECT * FROM ar_payments WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);

      // Get invoice linkages for matched payments
      const paymentIds = payments.map((p) => p.id);
      let invoiceLinkMap: Record<string, string> = {};
      if (paymentIds.length > 0) {
        const links = await fastify.sql<Array<{ payment_id: string; invoice_id: string }>>`
          SELECT payment_id, invoice_id FROM invoice_payments
          WHERE payment_id IN ${fastify.sql(paymentIds)}
          LIMIT ${paymentIds.length * 5}
        `.catch(() => [] as Array<{ payment_id: string; invoice_id: string }>);
        for (const link of links) {
          invoiceLinkMap[link.payment_id] = link.invoice_id;
        }
      }

      const items = payments.map((p) => ({
        id: p.id,
        paymentNumber: p.document_number,
        customerId: p.customer_id,
        invoiceId: invoiceLinkMap[p.id] ?? null,
        amountSatang: p.amount_satang.toString(),
        paymentDate: p.payment_date,
        paymentMethod: p.payment_method,
        reference: p.reference,
        status: p.status as 'unmatched' | 'matched' | 'voided',
        notes: p.notes,
        createdAt: toISO(p.created_at),
      }));

      return reply.status(200).send({ items, total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/payments/:id/void — void payment
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/payments/:id/void`,
    {
      schema: {
        description: 'Void a payment and restore invoice outstanding balance',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        response: { 200: { description: 'Payment voided', ...paymentResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_PAYMENT_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      // Get payment
      const paymentRows = await fastify.sql<[PaymentRow?]>`
        SELECT * FROM ar_payments WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const payment = paymentRows[0];
      if (!payment) {
        throw new NotFoundError({ detail: `Payment ${id} not found.` });
      }
      if (payment.status === 'voided') {
        throw new ConflictError({ detail: `Payment ${id} is already voided.` });
      }

      // Get linked invoice IDs before voiding
      const links = await fastify.sql<Array<{ invoice_id: string }>>`
        SELECT invoice_id FROM invoice_payments WHERE payment_id = ${id}
      `;

      // Reverse the associated journal entry if one exists
      const jeRows = await fastify.sql<[{ journal_entry_id: string | null }?]>`
        SELECT journal_entry_id FROM ar_payments WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const originalJeId = jeRows[0]?.journal_entry_id;

      if (originalJeId) {
        try {
          const { sub: userId } = request.user;

          // Get original JE lines to create reversal
          const jeLineRows = await fastify.sql<Array<{ line_number: number; account_id: string; description: string | null; debit_satang: string; credit_satang: string }>>`
            SELECT line_number, account_id, description, debit_satang::text, credit_satang::text
            FROM journal_entry_lines WHERE entry_id = ${originalJeId}
          `;

          // Get original JE for fiscal info
          const origJeRows = await fastify.sql<[{ document_number: string; fiscal_year: number; fiscal_period: number }?]>`
            SELECT document_number, fiscal_year, fiscal_period FROM journal_entries WHERE id = ${originalJeId} LIMIT 1
          `;
          const origJe = origJeRows[0];

          if (origJe && jeLineRows.length > 0) {
            // Mark original JE as reversed
            await fastify.sql`
              UPDATE journal_entries SET status = 'reversed', updated_at = NOW()
              WHERE id = ${originalJeId}
            `;

            // Create reversal JE
            const reversalJeId = crypto.randomUUID();
            const now = new Date();

            // Generate reversal JE document number
            const reversalDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', origJe.fiscal_year);

            await fastify.sql`
              INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, reversed_entry_id, tenant_id, created_by, posted_at, created_at, updated_at)
              VALUES (${reversalJeId}, ${reversalDocNumber}, ${'Reversal of ' + origJe.document_number + ' (AR payment void)'}, 'posted', ${origJe.fiscal_year}, ${origJe.fiscal_period}, ${originalJeId}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
            `;

            // Create reversed lines (swap debit/credit)
            for (const line of jeLineRows) {
              await fastify.sql`
                INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
                VALUES (${crypto.randomUUID()}, ${reversalJeId}, ${line.line_number}, ${line.account_id}, ${line.description}, ${line.credit_satang}::bigint, ${line.debit_satang}::bigint, ${now.toISOString()}::timestamptz)
              `;
            }

            request.log.info({ originalJeId, reversalJeId, tenantId }, 'Journal entry reversed for voided AR payment');
          }
        } catch (jeError) {
          request.log.error({ err: jeError, originalJeId, tenantId }, 'Failed to reverse journal entry for voided AR payment');
        }
      }

      // Void the payment
      await fastify.sql`
        UPDATE ar_payments SET status = 'voided', updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `.catch(() => fastify.sql`
        UPDATE ar_payments SET status = 'voided'
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `);

      // Update each linked invoice
      for (const link of links) {
        await updateInvoiceAfterPayment(fastify, link.invoice_id, tenantId);
      }

      request.log.info({ paymentId: id, tenantId }, 'Payment voided');

      return reply.status(200).send({
        id: payment.id,
        paymentNumber: payment.document_number,
        customerId: payment.customer_id,
        invoiceId: links[0]?.invoice_id ?? null,
        amountSatang: payment.amount_satang.toString(),
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method,
        reference: payment.reference,
        status: 'voided',
        notes: payment.notes,
        createdAt: toISO(payment.created_at),
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/payments/:id/match — match payment to invoices
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams; Body: MatchPaymentBody }>(
    `${API_V1_PREFIX}/payments/:id/match`,
    {
      schema: {
        description: 'Match a payment to one or more invoices',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: matchPaymentBodySchema,
        response: { 200: { description: 'Payment matched', ...paymentResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_PAYMENT_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { invoiceIds } = request.body;
      const { tenantId } = request.user;

      // Verify payment exists.
      const paymentRows = await fastify.sql<[PaymentRow?]>`
        SELECT * FROM ar_payments WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const payment = paymentRows[0];
      if (!payment) {
        throw new NotFoundError({ detail: `Payment ${id} not found.` });
      }

      // Create matching records for invoices.
      for (const invoiceId of invoiceIds) {
        const matchId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO invoice_payments (id, invoice_id, payment_id, amount_satang)
          VALUES (${matchId}, ${invoiceId}, ${id}, ${payment.amount_satang.toString()}::bigint)
          ON CONFLICT (invoice_id, payment_id) DO NOTHING
        `;
        await updateInvoiceAfterPayment(fastify, invoiceId, tenantId);
      }

      // Update payment status to matched
      await fastify.sql`
        UPDATE ar_payments SET status = 'matched' WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      request.log.info({ paymentId: id, invoiceIds, tenantId }, 'Payment matched to invoices');

      return reply.status(200).send({
        id: payment.id,
        paymentNumber: payment.document_number,
        customerId: payment.customer_id,
        invoiceId: invoiceIds[0] ?? null,
        amountSatang: payment.amount_satang.toString(),
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method,
        reference: payment.reference,
        status: 'matched',
        notes: payment.notes,
        createdAt: toISO(payment.created_at),
      });
    },
  );
}
