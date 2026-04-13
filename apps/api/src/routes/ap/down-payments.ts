/**
 * AP Down Payment routes:
 *   POST /api/v1/ap/down-payments            — create vendor down payment request
 *   POST /api/v1/ap/down-payments/:id/pay    — pay vendor advance
 *   POST /api/v1/ap/down-payments/:id/clear  — clear against vendor bill
 *
 * SAP-gap Phase 1 — Down Payments (AP side)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AP_DOWN_PAYMENT_CREATE,
  AP_DOWN_PAYMENT_MANAGE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const createBodySchema = {
  type: 'object',
  required: ['vendorId', 'amountSatang'],
  additionalProperties: false,
  properties: {
    vendorId: { type: 'string', description: 'Vendor ID' },
    amountSatang: { type: 'string', description: 'Down payment amount in satang' },
    referenceType: { type: 'string', enum: ['purchase_order'], description: 'Linked document type' },
    referenceId: { type: 'string', description: 'Linked document ID' },
  },
} as const;

const clearBodySchema = {
  type: 'object',
  required: ['billId'],
  additionalProperties: false,
  properties: {
    billId: { type: 'string', description: 'Vendor bill to clear against' },
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
  vendorId: string;
  amountSatang: string;
  referenceType?: string;
  referenceId?: string;
}

interface ClearBody {
  billId: string;
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

export async function apDownPaymentRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/ap/down-payments — create vendor down payment request
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateBody }>(
    `${API_V1_PREFIX}/ap/down-payments`,
    {
      schema: {
        description: 'Create AP vendor down payment request',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        body: createBodySchema,
        response: { 201: { description: 'Down payment request created', ...dpResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_DOWN_PAYMENT_CREATE)],
    },
    async (request, reply) => {
      const { vendorId, amountSatang, referenceType, referenceId } = request.body;
      const { tenantId, sub: userId } = request.user;

      const amount = BigInt(amountSatang);
      if (amount <= 0n) {
        throw new ValidationError({ detail: 'Amount must be > 0.' });
      }

      // Validate vendor
      const vendorRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM vendors WHERE id = ${vendorId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!vendorRows[0]) {
        throw new NotFoundError({ detail: `Vendor ${vendorId} not found.` });
      }

      const dpId = crypto.randomUUID();
      const now = new Date();
      const fiscalYear = now.getFullYear();
      const docNumber = await nextDocNumber(fastify.sql, tenantId, 'bill_payment', fiscalYear);

      await fastify.sql`
        INSERT INTO down_payments (id, type, document_number, contact_id, reference_type, reference_id, amount_satang, cleared_amount_satang, status, tenant_id, created_by, created_at, updated_at)
        VALUES (${dpId}, 'ap', ${docNumber}, ${vendorId}, ${referenceType ?? null}, ${referenceId ?? null}, ${amount.toString()}::bigint, 0::bigint, 'requested', ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      void reply.status(201);
      return {
        id: dpId,
        type: 'ap',
        documentNumber: docNumber,
        contactId: vendorId,
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
  // POST /api/v1/ap/down-payments/:id/pay — pay vendor advance
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/ap/down-payments/:id/pay`,
    {
      schema: {
        description: 'Pay vendor advance → creates JE (Dr Down Payment Paid asset, Cr Cash)',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Vendor advance paid', ...dpResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_DOWN_PAYMENT_MANAGE)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<[DpRow?]>`
        SELECT * FROM down_payments
        WHERE id = ${id} AND tenant_id = ${tenantId} AND type = 'ap'
        LIMIT 1
      `;
      const dp = rows[0];
      if (!dp) {
        throw new NotFoundError({ detail: `AP down payment ${id} not found.` });
      }
      if (dp.status !== 'requested') {
        throw new ConflictError({ detail: `Down payment ${id} is already ${dp.status}.` });
      }

      // Look up accounts
      const cashRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND (code LIKE '1110%' OR code LIKE '1120%') AND account_type = 'asset'
        ORDER BY code ASC LIMIT 1
      `;
      const dpAssetRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND code LIKE '1160%' AND account_type = 'asset'
        ORDER BY code ASC LIMIT 1
      `;

      const cashAccountId = cashRows[0]?.id;
      let dpAssetId = dpAssetRows[0]?.id;
      if (!dpAssetId) {
        // Fallback: use generic current asset
        const fallback = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM chart_of_accounts
          WHERE tenant_id = ${tenantId} AND is_active = true
            AND code LIKE '11%' AND account_type = 'asset'
          ORDER BY code DESC LIMIT 1
        `;
        dpAssetId = fallback[0]?.id;
      }

      if (!cashAccountId || !dpAssetId) {
        throw new ValidationError({ detail: 'Cannot find Cash or Down Payment Paid accounts.' });
      }

      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;
      const amount = BigInt(dp.amount_satang);

      // Create JE: Dr Down Payment Paid (asset), Cr Cash
      const jeId = crypto.randomUUID();
      const jeDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);

      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
        VALUES (${jeId}, ${jeDocNumber}, ${'AP down payment to vendor — ' + dp.document_number}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${dpAssetId}, ${'Vendor advance — ' + dp.document_number}, ${amount.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
      `;
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${cashAccountId}, ${'Cash payment — ' + dp.document_number}, 0::bigint, ${amount.toString()}::bigint, ${now.toISOString()}::timestamptz)
      `;

      await fastify.sql`
        UPDATE down_payments
        SET status = 'paid', journal_entry_id = ${jeId}, updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      return {
        id: dp.id,
        type: 'ap',
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
  // POST /api/v1/ap/down-payments/:id/clear — clear against vendor bill
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams; Body: ClearBody }>(
    `${API_V1_PREFIX}/ap/down-payments/:id/clear`,
    {
      schema: {
        description: 'Clear AP down payment against vendor bill',
        tags: ['ap'],
        security: [{ bearerAuth: [] }],
        body: clearBodySchema,
        response: { 200: { description: 'Down payment cleared', ...dpResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AP_DOWN_PAYMENT_MANAGE)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { billId, clearAmountSatang } = request.body;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<[DpRow?]>`
        SELECT * FROM down_payments
        WHERE id = ${id} AND tenant_id = ${tenantId} AND type = 'ap'
        LIMIT 1
      `;
      const dp = rows[0];
      if (!dp) {
        throw new NotFoundError({ detail: `AP down payment ${id} not found.` });
      }
      if (dp.status !== 'paid' && dp.status !== 'partial_cleared') {
        throw new ConflictError({ detail: `Down payment ${id} must be paid/partial_cleared to clear (current: ${dp.status}).` });
      }

      // Validate bill
      const billRows = await fastify.sql<[{ id: string; total_satang: bigint; paid_satang: bigint }?]>`
        SELECT id, total_satang, paid_satang FROM bills
        WHERE id = ${billId} AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      if (!billRows[0]) {
        throw new NotFoundError({ detail: `Bill ${billId} not found.` });
      }

      const remainingDp = BigInt(dp.amount_satang) - BigInt(dp.cleared_amount_satang);
      const clearAmount = clearAmountSatang ? BigInt(clearAmountSatang) : remainingDp;

      if (clearAmount <= 0n || clearAmount > remainingDp) {
        throw new ValidationError({ detail: `Clear amount must be between 1 and ${remainingDp.toString()} satang.` });
      }

      const newClearedAmount = BigInt(dp.cleared_amount_satang) + clearAmount;
      const newStatus = newClearedAmount >= BigInt(dp.amount_satang) ? 'cleared' : 'partial_cleared';

      // Create clearing JE: Dr AP, Cr Down Payment Paid (asset)
      const apRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND code LIKE '2110%' AND account_type = 'liability'
        ORDER BY code ASC LIMIT 1
      `;
      const dpAssetRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND (code LIKE '1160%' OR code LIKE '11%') AND account_type = 'asset'
        ORDER BY code ASC LIMIT 1
      `;

      const apAccountId = apRows[0]?.id;
      const dpAssetId = dpAssetRows[0]?.id;
      if (!apAccountId || !dpAssetId) {
        throw new ValidationError({ detail: 'Cannot find AP or Down Payment Paid accounts.' });
      }

      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;

      const jeId = crypto.randomUUID();
      const jeDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);

      await fastify.sql`
        INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
        VALUES (${jeId}, ${jeDocNumber}, ${'Clear AP down payment ' + dp.document_number + ' against bill ' + billId}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
      `;

      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${apAccountId}, ${'AP clearance from down payment'}, ${clearAmount.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
      `;
      await fastify.sql`
        INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
        VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${dpAssetId}, ${'Clear vendor advance'}, 0::bigint, ${clearAmount.toString()}::bigint, ${now.toISOString()}::timestamptz)
      `;

      // Update down payment
      await fastify.sql`
        UPDATE down_payments
        SET cleared_amount_satang = ${newClearedAmount.toString()}::bigint, status = ${newStatus}, clearing_je_id = ${jeId}, updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      // Update bill paid_satang
      await fastify.sql`
        UPDATE bills
        SET paid_satang = paid_satang + ${clearAmount.toString()}::bigint,
            status = CASE
              WHEN paid_satang + ${clearAmount.toString()}::bigint >= total_satang THEN 'paid'
              ELSE 'partial'
            END,
            updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${billId} AND tenant_id = ${tenantId}
      `;

      return {
        id: dp.id,
        type: 'ap',
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
