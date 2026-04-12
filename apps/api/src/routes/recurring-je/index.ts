/**
 * Recurring Journal Entry routes:
 *   POST /api/v1/recurring-je              — create template
 *   GET  /api/v1/recurring-je              — list templates
 *   GET  /api/v1/recurring-je/:id          — detail
 *   PUT  /api/v1/recurring-je/:id          — update
 *   DELETE /api/v1/recurring-je/:id        — deactivate
 *   POST /api/v1/recurring-je/run          — execute pending templates
 *
 * Phase 3.5 — Recurring Journal Entries
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import { GL_JOURNAL_CREATE, GL_JOURNAL_READ } from '../../lib/permissions.js';

interface IdParams { id: string; }

interface TemplateRow {
  id: string; description: string; lines: unknown;
  frequency: string; next_run_date: string;
  is_active: boolean; last_run_at: Date | string | null;
  tenant_id: string; created_by: string;
  created_at: Date | string; updated_at: Date | string;
}

interface JELine {
  accountId: string;
  description?: string;
  debitSatang: string;
  creditSatang: string;
}

function mapTemplate(r: TemplateRow) {
  return {
    id: r.id, description: r.description,
    lines: r.lines as JELine[],
    frequency: r.frequency, nextRunDate: r.next_run_date,
    isActive: r.is_active,
    lastRunAt: r.last_run_at ? toISO(r.last_run_at) : null,
    createdBy: r.created_by,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

function advanceDate(dateStr: string, frequency: string): string {
  const d = new Date(dateStr);
  switch (frequency) {
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'annually': d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

export async function recurringJeRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /recurring-je
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/recurring-je`,
    {
      schema: { description: 'Create recurring JE template', tags: ['gl'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId, sub: userId } = request.user;

      if (!b['description'] || !b['lines'] || !b['nextRunDate']) {
        throw new ValidationError({ detail: 'description, lines, and nextRunDate are required.' });
      }

      const lines = b['lines'] as JELine[];
      // Validate double-entry
      let totalDebit = 0n, totalCredit = 0n;
      for (const line of lines) {
        totalDebit += BigInt(line.debitSatang || '0');
        totalCredit += BigInt(line.creditSatang || '0');
      }
      if (totalDebit !== totalCredit || totalDebit === 0n) {
        throw new ValidationError({ detail: 'Lines must balance (debits = credits) and be non-zero.' });
      }

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO recurring_je_templates (id, description, lines, frequency, next_run_date, tenant_id, created_by)
        VALUES (
          ${id}, ${b['description'] as string},
          ${JSON.stringify(lines)}::jsonb,
          ${(b['frequency'] as string) ?? 'monthly'},
          ${b['nextRunDate'] as string},
          ${tenantId}, ${userId}
        )
      `;
      const rows = await fastify.sql<TemplateRow[]>`SELECT * FROM recurring_je_templates WHERE id = ${id}`;
      return reply.status(201).send(mapTemplate(rows[0]!));
    },
  );

  // GET /recurring-je
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/recurring-je`,
    {
      schema: { description: 'List recurring JE templates', tags: ['gl'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = Math.min(Math.max(parseInt(request.query['limit'] ?? '50', 10), 1), 100);
      const offset = Math.max(parseInt(request.query['offset'] ?? '0', 10), 0);

      const countRows = await fastify.sql<[{ count: string }]>`
        SELECT COUNT(*)::text as count FROM recurring_je_templates WHERE tenant_id = ${tenantId}
      `;
      const total = parseInt(countRows[0]?.count ?? '0', 10);

      const rows = await fastify.sql<TemplateRow[]>`
        SELECT * FROM recurring_je_templates WHERE tenant_id = ${tenantId} ORDER BY next_run_date
        LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ items: rows.map(mapTemplate), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // GET /recurring-je/:id
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/recurring-je/:id`,
    {
      schema: { description: 'Get recurring JE template detail', tags: ['gl'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<TemplateRow[]>`
        SELECT * FROM recurring_je_templates WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Template ${id} not found.` });
      return reply.send(mapTemplate(rows[0]));
    },
  );

  // PUT /recurring-je/:id
  fastify.put<{ Params: IdParams; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/recurring-je/:id`,
    {
      schema: { description: 'Update recurring JE template', tags: ['gl'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      // If lines provided, validate balance
      if (b['lines']) {
        const lines = b['lines'] as JELine[];
        let totalDebit = 0n, totalCredit = 0n;
        for (const line of lines) {
          totalDebit += BigInt(line.debitSatang || '0');
          totalCredit += BigInt(line.creditSatang || '0');
        }
        if (totalDebit !== totalCredit || totalDebit === 0n) {
          throw new ValidationError({ detail: 'Lines must balance (debits = credits) and be non-zero.' });
        }
      }

      const rows = await fastify.sql<TemplateRow[]>`
        UPDATE recurring_je_templates SET
          description = COALESCE(${(b['description'] as string) ?? null}, description),
          lines = COALESCE(${b['lines'] ? JSON.stringify(b['lines']) : null}::jsonb, lines),
          frequency = COALESCE(${(b['frequency'] as string) ?? null}, frequency),
          next_run_date = COALESCE(${(b['nextRunDate'] as string) ?? null}, next_run_date),
          is_active = COALESCE(${b['isActive'] != null ? Boolean(b['isActive']) : null}, is_active),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Template ${id} not found.` });
      return reply.send(mapTemplate(rows[0]));
    },
  );

  // DELETE /recurring-je/:id (soft)
  fastify.delete<{ Params: IdParams }>(
    `${API_V1_PREFIX}/recurring-je/:id`,
    {
      schema: { description: 'Deactivate recurring JE template', tags: ['gl'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_CREATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      await fastify.sql`
        UPDATE recurring_je_templates SET is_active = FALSE, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      return reply.send({ id, deleted: true });
    },
  );

  // POST /recurring-je/run — execute all pending templates
  // Rate limit: expensive batch operation
  fastify.post(
    `${API_V1_PREFIX}/recurring-je/run`,
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: { description: 'Execute pending recurring JE templates', tags: ['gl'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(GL_JOURNAL_CREATE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user;
      const today = new Date().toISOString().slice(0, 10);

      // Get all active templates whose next_run_date <= today (capped at 50 per batch)
      const templates = await fastify.sql<TemplateRow[]>`
        SELECT * FROM recurring_je_templates
        WHERE tenant_id = ${tenantId} AND is_active = TRUE AND next_run_date <= ${today}
        ORDER BY next_run_date
        LIMIT 50
      `;

      const created: Array<{ templateId: string; journalEntryId: string }> = [];

      for (const tmpl of templates) {
        const lines = (typeof tmpl.lines === 'string' ? JSON.parse(tmpl.lines) : tmpl.lines) as JELine[];
        const jeId = crypto.randomUUID();
        const jeNumber = `RJE-${Date.now()}-${created.length}`;
        const now = new Date();
        const fiscalYear = now.getFullYear();
        const fiscalPeriod = now.getMonth() + 1;

        // Create journal entry header
        await fastify.sql`
          INSERT INTO journal_entries (id, document_number, description, status, fiscal_year, fiscal_period, tenant_id, created_by, posted_at)
          VALUES (
            ${jeId}, ${jeNumber},
            ${'Recurring: ' + tmpl.description},
            'posted', ${fiscalYear}, ${fiscalPeriod},
            ${tenantId}, ${userId}, NOW()
          )
        `;

        // Create journal entry lines
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          await fastify.sql`
            INSERT INTO journal_entry_lines (id, entry_id, line_number, account_id, description, debit_satang, credit_satang)
            VALUES (
              ${crypto.randomUUID()}, ${jeId}, ${i + 1},
              ${line.accountId}, ${line.description ?? tmpl.description},
              ${line.debitSatang}::bigint, ${line.creditSatang}::bigint
            )
          `;
        }

        // Advance next_run_date
        const nextDate = advanceDate(tmpl.next_run_date, tmpl.frequency);
        await fastify.sql`
          UPDATE recurring_je_templates
          SET next_run_date = ${nextDate}, last_run_at = NOW(), updated_at = NOW()
          WHERE id = ${tmpl.id}
        `;

        created.push({ templateId: tmpl.id, journalEntryId: jeId });
      }

      return reply.send({ processed: created.length, entries: created });
    },
  );
}
