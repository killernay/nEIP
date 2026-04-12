/**
 * Dunning routes:
 *   POST /api/v1/dunning/run             — run dunning process
 *   GET  /api/v1/dunning/list            — list dunning cases
 *   GET  /api/v1/dunning/levels          — list dunning levels
 *   POST /api/v1/dunning/levels          — create/update dunning level
 *
 * Phase 3.3 — Dunning
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import { AR_INVOICE_READ, DUNNING_MANAGE } from '../../lib/permissions.js';

interface DunningLevelRow {
  id: string; level: number; days_overdue: number;
  template: string; fee_satang: bigint; tenant_id: string;
  created_at: Date | string;
}

interface DunningHistoryRow {
  id: string; invoice_id: string; contact_id: string | null;
  level: number; fee_satang: bigint;
  sent_at: Date | string; response: string | null;
  status: string; tenant_id: string; created_at: Date | string;
}

interface OverdueInvoiceRow {
  id: string; invoice_number: string; customer_id: string;
  total_satang: string; paid_satang: string; due_date: string;
  status: string;
}

export async function dunningRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // GET /dunning/levels
  fastify.get(
    `${API_V1_PREFIX}/dunning/levels`,
    {
      schema: { description: 'List dunning levels', tags: ['dunning'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(AR_INVOICE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<DunningLevelRow[]>`
        SELECT * FROM dunning_levels WHERE tenant_id = ${tenantId} ORDER BY level
      `;
      return reply.send({
        items: rows.map((r) => ({
          id: r.id, level: r.level, daysOverdue: r.days_overdue,
          template: r.template, feeSatang: r.fee_satang.toString(),
          createdAt: toISO(r.created_at),
        })),
      });
    },
  );

  // POST /dunning/levels
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/dunning/levels`,
    {
      schema: { description: 'Create or update a dunning level', tags: ['dunning'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(DUNNING_MANAGE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const level = Number(b['level']);
      const daysOverdue = Number(b['daysOverdue']);
      const template = (b['template'] as string) ?? '';
      const feeSatang = (b['feeSatang'] as string) ?? '0';

      // Upsert by level + tenant
      const existing = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM dunning_levels WHERE level = ${level} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (existing[0]) {
        await fastify.sql`
          UPDATE dunning_levels SET days_overdue = ${daysOverdue}, template = ${template},
            fee_satang = ${feeSatang}::bigint
          WHERE id = ${existing[0].id}
        `;
        return reply.send({ id: existing[0].id, updated: true });
      }

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO dunning_levels (id, level, days_overdue, template, fee_satang, tenant_id)
        VALUES (${id}, ${level}, ${daysOverdue}, ${template}, ${feeSatang}::bigint, ${tenantId})
      `;
      return reply.status(201).send({ id, created: true });
    },
  );

  // POST /dunning/run — find overdue invoices, assign dunning level, create history
  // Rate limit: expensive batch operation
  fastify.post(
    `${API_V1_PREFIX}/dunning/run`,
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: { description: 'Run dunning process — find overdue invoices and assign levels', tags: ['dunning'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(DUNNING_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const today = new Date().toISOString().slice(0, 10);

      // Get dunning levels for this tenant
      const levels = await fastify.sql<DunningLevelRow[]>`
        SELECT * FROM dunning_levels WHERE tenant_id = ${tenantId} ORDER BY days_overdue DESC
      `;
      if (levels.length === 0) {
        return reply.send({ processed: 0, message: 'No dunning levels configured.' });
      }

      // Get overdue invoices (posted/sent/partial, past due date)
      const overdueInvoices = await fastify.sql<OverdueInvoiceRow[]>`
        SELECT id, invoice_number, customer_id, total_satang::text, paid_satang::text, due_date, status
        FROM invoices
        WHERE tenant_id = ${tenantId}
          AND status IN ('posted', 'sent', 'partial', 'overdue')
          AND due_date < ${today}
        ORDER BY due_date ASC
        LIMIT 100
      `;

      let processed = 0;
      const results: Array<{ invoiceId: string; invoiceNumber: string; level: number; feeSatang: string }> = [];

      for (const inv of overdueInvoices) {
        const outstanding = BigInt(inv.total_satang) - BigInt(inv.paid_satang);
        if (outstanding <= 0n) continue;

        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor((new Date(today).getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Find the highest matching dunning level
        let matchedLevel: DunningLevelRow | undefined;
        for (const lvl of levels) {
          if (daysOverdue >= lvl.days_overdue) {
            matchedLevel = lvl;
            break;
          }
        }
        if (!matchedLevel) continue;

        // Check if already dunned at this level
        const existing = await fastify.sql<[{ id: string }?]>`
          SELECT id FROM dunning_history
          WHERE invoice_id = ${inv.id} AND level = ${matchedLevel.level} AND tenant_id = ${tenantId}
          LIMIT 1
        `;
        if (existing[0]) continue;

        // Create dunning history record
        const histId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO dunning_history (id, invoice_id, contact_id, level, fee_satang, status, tenant_id)
          VALUES (${histId}, ${inv.id}, ${inv.customer_id}, ${matchedLevel.level},
            ${matchedLevel.fee_satang.toString()}::bigint, 'sent', ${tenantId})
        `;

        // Update invoice status to overdue if not already
        if (inv.status !== 'overdue') {
          await fastify.sql`
            UPDATE invoices SET status = 'overdue', updated_at = NOW()
            WHERE id = ${inv.id} AND tenant_id = ${tenantId}
          `;
        }

        // Try to send notification (best-effort)
        try {
          await fastify.sql`
            INSERT INTO notification_log (id, tenant_id, channel, recipient, subject, body, status, created_at)
            VALUES (
              ${crypto.randomUUID()}, ${tenantId}, 'email', ${inv.customer_id},
              ${'Dunning Notice Level ' + matchedLevel.level + ' — ' + inv.invoice_number.replace(/[<>&"']/g, '')},
              ${matchedLevel.template || 'Payment overdue for invoice ' + inv.invoice_number},
              'sent', NOW()
            )
          `;
        } catch { /* notification is best-effort */ }

        results.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          level: matchedLevel.level,
          feeSatang: matchedLevel.fee_satang.toString(),
        });
        processed++;
      }

      return reply.send({ processed, results });
    },
  );

  // GET /dunning/list — list all dunning cases
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/dunning/list`,
    {
      schema: { description: 'List all dunning cases with status', tags: ['dunning'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(AR_INVOICE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);

      const rows = await fastify.sql<DunningHistoryRow[]>`
        SELECT * FROM dunning_history WHERE tenant_id = ${tenantId}
        ORDER BY sent_at DESC LIMIT ${limit} OFFSET ${offset}
      `;

      const countRows = await fastify.sql<[{ count: string }]>`
        SELECT COUNT(*)::text as count FROM dunning_history WHERE tenant_id = ${tenantId}
      `;
      const total = parseInt(countRows[0]?.count ?? '0', 10);

      return reply.send({
        items: rows.map((r) => ({
          id: r.id, invoiceId: r.invoice_id, contactId: r.contact_id,
          level: r.level, feeSatang: r.fee_satang.toString(),
          sentAt: toISO(r.sent_at), response: r.response,
          status: r.status, createdAt: toISO(r.created_at),
        })),
        total, limit, offset, hasMore: offset + limit < total,
      });
    },
  );
}
