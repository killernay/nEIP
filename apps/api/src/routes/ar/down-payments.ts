/**
 * AR Down Payment routes:
 *   POST /api/v1/ar/down-payments            — create down payment request
 *   POST /api/v1/ar/down-payments/:id/receive — record receipt of down payment
 *   POST /api/v1/ar/down-payments/:id/clear  — clear against final invoice
 *
 * SAP-gap Phase 1 — Down Payments (AR side)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_DOWN_PAYMENT_CREATE,
  AR_DOWN_PAYMENT_MANAGE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const createBodySchema = {
  type: 'object',
  required: ['customerId', 'amountSatang'],
  additionalProperties: false,
  properties: {
    customerId: { type: 'string', description: 'Customer ID' },
    amountSatang: { type: 'string', description: 'Down payment amount in satang' },
    referenceType: { type: 'string', enum: ['quotation', 'sales_order'], description: 'Linked document type' },
    referenceId: { type: 'string', description: 'Linked document ID' },
  },
} as const;

const clearBodySchema = {
  type: 'object',
  required: ['invoiceId'],
  additionalProperties: false,
  properties: {
    invoiceId: { type: 'string', description: 'Final invoice to clear against' },
    clearAmountSatang: { type: 'string', description: 'Amount to clear (defaults to full down payment)' },
  },
} as const;

const dpResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    documentNumber: { type: 'string' },
    contactId: { type: 'string' },
    referenceType: { type: 'string', nullable: true },
    referenceId: { type: 'string', nullable: true },
    amountSatang: { type: 'string' },
    clearedAmountSatang: { type: 'string' },
    status: { type: 'string' },
    journalEntryId: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateBody {
  customerId: string;
  amountSatang: string;
  referenceType?: string;
  referenceId?: string;
}

interface ClearBody {
  invoiceId: string;
  clearAmountSatang?: string;
}

interface IdParams {
  id: string;
}

interface DpRow {
  id: string;
  type: string;
  document_number: string;
  contact_id: string;
  reference_type: string | null;
  reference_id: string | null;
  amount_satang: bigint;
  cleared_amount_satang: bigint;
  status: string;
  journal_entry_id: string | null;
  clearing_je_id: string | null;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function arDownPaymentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/ar/down-payments — create down payment request
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateBody }>(
    `${API_V1_PREFIX}/ar/down-payments`,
    {
      schema: {
        description: 'Create AR down payment request',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: createBodySchema,
        response: { 201: { description: 'Down payment request created', ...dpResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_DOWN_PAYMENT_CREATE)],
    },
    async (request, reply) => {
      const { customerId, amountSatang, referenceType, referenceId } = request.body;
      const { tenantId, sub: userId } = request.user;

      const amount = BigInt(amountSatang);
      if (amount <= 0n) {
        throw new ValidationError({ detail: 'Amount must be > 0.' });
      }

      // Validate customer
      const custRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM contacts WHERE id = ${customerId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!custRows[0]) {
        throw new NotFoundError({ detail: `Customer ${customerId} not found.` });
      }

      const dpId = crypto.randomUUID();
      const now = new Date();
      const fiscalYear = now.getFullYear();
      const docNumber = await nextDocNumber(fastify.sql, tenantId, 'receipt', fiscalYear);

      await fastify.sql`
        INSERT INTO down_payments (id, type, document_number, contact_id, reference_type, reference_id, amount_satang, cleared_amount_satang, status, tenant_id, created_by, created_at, updated_at)
        VALUES (${dpId}, 'ar', ${docNumber}, ${customerId}, ${referenceType ?? null}, ${referenceId ?? null}, ${amount.toString()}::bigint, 0::bigint, 'requested', ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      void reply.status(201);
      return {
        id: dpId,
        type: 'ar',
        documentNumber: docNumber,
        contactId: customerId,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        amountSatang: amount.toString(),
        clearedAmountSatang: '0',
        status: 'requested',
        journalEntryId: null,
        createdAt: toISO(now),
      };
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/ar/down-payments/:id/receive — record receipt
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/ar/down-payments/:id/receive`,
    {
      schema: {
        description: 'Record receipt of AR down payment → creates JE (Dr Cash, Cr Down Payment Received liability)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Down payment received', ...dpResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_DOWN_PAYMENT_MANAGE)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<[DpRow?]>`
        SELECT * FROM down_payments
        WHERE id = ${id} AND tenant_id = ${tenantId} AND type = 'ar'
        LIMIT 1
      `;
      const dp = rows[0];
      if (!dp) {
        throw new NotFoundError({ detail: `AR down payment ${id} not found.` });
      }
      if (dp.status !== 'requested') {
        throw new ConflictError({ detail: `Down payment ${id} is already ${dp.status}.` });
      }

      // Look up Cash and Down Payment Received (liability) accounts
      const cashRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND (code LIKE '1110%' OR code LIKE '1120%') AND account_type = 'asset'
        ORDER BY code ASC LIMIT 1
      `;
      const dpLiabilityRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND code LIKE '2150%' AND account_type = 'liability'
        ORDER BY code ASC LIMIT 1
      `;

      // Fallback: use generic current liability if 2150 doesn't exist
      const cashAccountId = cashRows[0]?.id;
      let dpLiabilityId = dpLiabilityRows[0]?.id;
      if (!dpLiabilityId) {
        const fallback = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM chart_of_accounts
          WHERE tenant_id = ${tenantId} AND is_active = true
            AND code LIKE '21%' AND account_type = 'liability'
          ORDER BY code ASC LIMIT 1
        `;
        dpLiabilityId = fallback[0]?.id;
      }

      if (!cashAccountId || !dpLiabilityId) {
        throw new ValidationError({ detail: 'Cannot find Cash or Down Payment Received accounts.' });
      }

      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;
      const amount = BigInt(dp.amount_satang);

      // Create JE: Dr Cash, Cr Down Payment Received
      const jeId = crypto.randomUUID();
      const jeDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);

      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
        VALUES (${jeId}, ${jeDocNumber}, ${'AR down payment received — ' + dp.document_number}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${cashAccountId}, ${'Cash received — ' + dp.document_number}, ${amount.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
      `;
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${dpLiabilityId}, ${'Down payment liability — ' + dp.document_number}, 0::bigint, ${amount.toString()}::bigint, ${now.toISOString()}::timestamptz)
      `;

      // Update down payment status
      await fastify.sql`
        UPDATE down_payments
        SET status = 'paid', journal_entry_id = ${jeId}, updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      return {
        id: dp.id,
        type: 'ar',
        documentNumber: dp.document_number,
        contactId: dp.contact_id,
        referenceType: dp.reference_type,
        referenceId: dp.reference_id,
        amountSatang: dp.amount_satang.toString(),
        clearedAmountSatang: '0',
        status: 'paid',
        journalEntryId: jeId,
        createdAt: toISO(dp.created_at),
      };
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/ar/down-payments/:id/clear — clear against final invoice
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams; Body: ClearBody }>(
    `${API_V1_PREFIX}/ar/down-payments/:id/clear`,
    {
      schema: {
        description: 'Clear AR down payment against final invoice',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: clearBodySchema,
        response: { 200: { description: 'Down payment cleared', ...dpResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_DOWN_PAYMENT_MANAGE)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { invoiceId, clearAmountSatang } = request.body;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<[DpRow?]>`
        SELECT * FROM down_payments
        WHERE id = ${id} AND tenant_id = ${tenantId} AND type = 'ar'
        LIMIT 1
      `;
      const dp = rows[0];
      if (!dp) {
        throw new NotFoundError({ detail: `AR down payment ${id} not found.` });
      }
      if (dp.status !== 'paid' && dp.status !== 'partial_cleared') {
        throw new ConflictError({ detail: `Down payment ${id} must be in paid/partial_cleared status to clear (current: ${dp.status}).` });
      }

      // Validate invoice
      const invRows = await fastify.sql<[{ id: string; total_satang: bigint; paid_satang: bigint }?]>`
        SELECT id, total_satang, paid_satang FROM invoices
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId} AND invoice_type = 'standard'
        LIMIT 1
      `;
      if (!invRows[0]) {
        throw new NotFoundError({ detail: `Invoice ${invoiceId} not found.` });
      }

      const remainingDp = BigInt(dp.amount_satang) - BigInt(dp.cleared_amount_satang);
      const clearAmount = clearAmountSatang ? BigInt(clearAmountSatang) : remainingDp;

      if (clearAmount <= 0n || clearAmount > remainingDp) {
        throw new ValidationError({ detail: `Clear amount must be between 1 and ${remainingDp.toString()} satang.` });
      }

      const newClearedAmount = BigInt(dp.cleared_amount_satang) + clearAmount;
      const newStatus = newClearedAmount >= BigInt(dp.amount_satang) ? 'cleared' : 'partial_cleared';

      // Create clearing JE: Dr Down Payment Received (liability), Cr AR
      const dpLiabilityRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND (code LIKE '2150%' OR code LIKE '21%') AND account_type = 'liability'
        ORDER BY code ASC LIMIT 1
      `;
      const arRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND code LIKE '1130%' AND account_type = 'asset'
        ORDER BY code ASC LIMIT 1
      `;

      const dpLiabilityId = dpLiabilityRows[0]?.id;
      const arAccountId = arRows[0]?.id;
      if (!dpLiabilityId || !arAccountId) {
        throw new ValidationError({ detail: 'Cannot find Down Payment Received or AR accounts.' });
      }

      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;

      const jeId = crypto.randomUUID();
      const jeDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);

      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
        VALUES (${jeId}, ${jeDocNumber}, ${'Clear AR down payment ' + dp.document_number + ' against invoice ' + invoiceId}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${dpLiabilityId}, ${'Clear down payment liability'}, ${clearAmount.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
      `;
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${arAccountId}, ${'Apply down payment to AR'}, 0::bigint, ${clearAmount.toString()}::bigint, ${now.toISOString()}::timestamptz)
      `;

      // Update down payment
      await fastify.sql`
        UPDATE down_payments
        SET cleared_amount_satang = ${newClearedAmount.toString()}::bigint, status = ${newStatus}, clearing_je_id = ${jeId}, updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      // Update invoice paid_satang
      await fastify.sql`
        UPDATE invoices
        SET paid_satang = paid_satang + ${clearAmount.toString()}::bigint,
            status = CASE
              WHEN paid_satang + ${clearAmount.toString()}::bigint >= total_satang THEN 'paid'
              ELSE 'partial'
            END,
            updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${invoiceId} AND tenant_id = ${tenantId}
      `;

      return {
        id: dp.id,
        type: 'ar',
        documentNumber: dp.document_number,
        contactId: dp.contact_id,
        referenceType: dp.reference_type,
        referenceId: dp.reference_id,
        amountSatang: dp.amount_satang.toString(),
        clearedAmountSatang: newClearedAmount.toString(),
        status: newStatus,
        journalEntryId: dp.journal_entry_id,
        createdAt: toISO(dp.created_at),
      };
    },
  );
}
