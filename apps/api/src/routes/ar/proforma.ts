/**
 * Pro-Forma Invoice routes:
 *   POST /api/v1/invoices/:id/convert-to-standard — convert proforma to standard invoice
 *
 * Also enhances invoice creation by supporting invoice_type: 'standard' | 'proforma' | 'credit_note'
 * Pro-forma invoices do NOT create JE on post — just change status to "sent".
 * Cannot receive payment against pro-forma — must convert to standard first.
 *
 * SAP-gap Phase 1 — Pro-Forma Invoice
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_INVOICE_CREATE,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IdParams {
  id: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  status: string;
  invoice_type: string;
  total_satang: bigint;
  paid_satang: bigint;
  due_date: string;
  notes: string | null;
  journal_entry_id: string | null;
  tenant_id: string;
  created_by: string;
  posted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function proformaRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/invoices/:id/convert-to-standard
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/invoices/:id/convert-to-standard`,
    {
      schema: {
        description: 'Convert a pro-forma invoice to a standard invoice — assigns a new invoice number and creates the posting JE',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Invoice converted to standard',
            type: 'object',
            properties: {
              id: { type: 'string' },
              invoiceNumber: { type: 'string' },
              invoiceType: { type: 'string' },
              status: { type: 'string' },
              totalSatang: { type: 'string' },
              journalEntryId: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_INVOICE_CREATE)],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const { tenantId, sub: userId } = request.user;

      const rows = await fastify.sql<[InvoiceRow?]>`
        SELECT * FROM invoices
        WHERE id = ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `;
      const inv = rows[0];
      if (!inv) {
        throw new NotFoundError({ detail: `Invoice ${id} not found.` });
      }
      if (inv.invoice_type !== 'proforma') {
        throw new ConflictError({ detail: `Invoice ${id} is not a pro-forma invoice (type: ${inv.invoice_type}).` });
      }
      if (inv.status === 'void') {
        throw new ConflictError({ detail: `Cannot convert voided pro-forma invoice.` });
      }

      const now = new Date();
      const fiscalYear = now.getFullYear();
      const fiscalPeriod = now.getMonth() + 1;

      // Generate new standard invoice number
      const newInvoiceNumber = await nextDocNumber(fastify.sql, tenantId, 'invoice', fiscalYear);

      // Look up Revenue and AR accounts for JE
      const arRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND code LIKE '1130%' AND account_type = 'asset'
        ORDER BY code ASC LIMIT 1
      `;
      const revenueRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM chart_of_accounts
        WHERE tenant_id = ${tenantId} AND is_active = true
          AND code LIKE '4%' AND account_type = 'revenue'
        ORDER BY code ASC LIMIT 1
      `;

      let jeId: string | null = null;

      if (arRows[0]?.id && revenueRows[0]?.id) {
        // Create posting JE: Dr AR, Cr Revenue
        jeId = crypto.randomUUID();
        const jeDocNumber = await nextDocNumber(fastify.sql, tenantId, 'journal_entry', fiscalYear);
        const amount = BigInt(inv.total_satang);

        await fastify.sql`
          INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at, created_at, updated_at)
          VALUES (${jeId}, ${jeDocNumber}, ${'Post invoice ' + newInvoiceNumber + ' (converted from proforma ' + inv.invoice_number + ')'}, 'posted', ${fiscalYear}, ${fiscalPeriod}, ${tenantId}, ${userId}, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz, ${now.toISOString()}::timestamptz)
        `;

        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
          VALUES (${crypto.randomUUID()}, ${jeId}, 1, ${arRows[0].id}, ${'AR — ' + newInvoiceNumber}, ${amount.toString()}::bigint, 0::bigint, ${now.toISOString()}::timestamptz)
        `;
        await fastify.sql`
          INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang, created_at)
          VALUES (${crypto.randomUUID()}, ${jeId}, 2, ${revenueRows[0].id}, ${'Revenue — ' + newInvoiceNumber}, 0::bigint, ${amount.toString()}::bigint, ${now.toISOString()}::timestamptz)
        `;
      }

      // Update invoice: change type to standard, update number, set posted
      await fastify.sql`
        UPDATE invoices
        SET invoice_type = 'standard',
            invoice_number = ${newInvoiceNumber},
            status = 'posted',
            posted_at = ${now.toISOString()}::timestamptz,
            journal_entry_id = ${jeId},
            updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      return {
        id: inv.id,
        invoiceNumber: newInvoiceNumber,
        invoiceType: 'standard',
        status: 'posted',
        totalSatang: inv.total_satang.toString(),
        journalEntryId: jeId,
        createdAt: toISO(inv.created_at),
        updatedAt: toISO(now),
      };
    },
  );
}
