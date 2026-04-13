/**
 * Data Archiving / Retention + Master Data Governance routes:
 *   POST /api/v1/archive/policies          — create archive policy
 *   GET  /api/v1/archive/policies          — list policies
 *   PUT  /api/v1/archive/policies/:id      — update policy
 *   POST /api/v1/archive/run               — execute archive run
 *   GET  /api/v1/archive/records            — list archived records
 *   POST /api/v1/mdg/change-requests       — submit change request
 *   GET  /api/v1/mdg/change-requests       — list change requests
 *   GET  /api/v1/mdg/change-requests/:id   — detail
 *   POST /api/v1/mdg/change-requests/:id/approve — approve + apply
 *   POST /api/v1/mdg/change-requests/:id/reject  — reject
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  SYS_ARCHIVE_MANAGE, SYS_ARCHIVE_RUN,
  MDG_REQUEST_CREATE, MDG_REQUEST_READ, MDG_REQUEST_APPROVE,
} from '../../lib/permissions.js';

export async function archiveMdgRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // ---- Archive Policies ----

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/archive/policies`,
    {
      schema: { description: 'Create archive policy', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(SYS_ARCHIVE_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['entityType']) throw new ValidationError({ detail: 'entityType is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO archive_policies (id, entity_type, retention_years, is_active, tenant_id)
        VALUES (${id}, ${b['entityType'] as string}, ${(b['retentionYears'] as number) ?? 7}, true, ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM archive_policies WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/archive/policies`,
    {
      schema: { description: 'List archive policies', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(SYS_ARCHIVE_MANAGE)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM archive_policies WHERE tenant_id = ${request.user.tenantId} ORDER BY entity_type
      `;
      return reply.send(rows);
    },
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/archive/policies/:id`,
    {
      schema: { description: 'Update archive policy', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(SYS_ARCHIVE_MANAGE)],
    },
    async (request, reply) => {
      const b = request.body;
      const res = await fastify.sql`
        UPDATE archive_policies SET
          retention_years = COALESCE(${(b['retentionYears'] as number) ?? null}, retention_years),
          is_active = COALESCE(${(b['isActive'] as boolean) ?? null}, is_active)
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId}
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Policy not found.' });
      return reply.send(res[0]);
    },
  );

  // POST /archive/run — execute archiving
  fastify.post(
    `${API_V1_PREFIX}/archive/run`,
    {
      schema: { description: 'Execute archive run', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(SYS_ARCHIVE_RUN)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const policies = await fastify.sql`
        SELECT * FROM archive_policies WHERE tenant_id = ${tenantId} AND is_active = true
      `;

      let totalArchived = 0;
      const results: Array<Record<string, unknown>> = [];

      for (const policy of policies) {
        const p = policy as Record<string, unknown>;
        const entityType = p['entity_type'] as string;
        const years = p['retention_years'] as number;
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

        // Archive old records from supported tables
        const tableMap: Record<string, string> = {
          'journal_entry': 'journal_entries',
          'invoice': 'invoices',
          'bill': 'bills',
        };
        const tableName = tableMap[entityType];
        if (!tableName) continue;

        const oldRecords = await fastify.sql.unsafe(
          `SELECT * FROM ${tableName} WHERE tenant_id = $1 AND created_at < $2 LIMIT 1000`,
          [tenantId, cutoffDate.toISOString()],
        );

        for (const record of oldRecords) {
          const r = record as Record<string, unknown>;
          const archiveId = crypto.randomUUID();
          await fastify.sql`
            INSERT INTO archived_records (id, entity_type, entity_id, archive_policy_id, data, tenant_id)
            VALUES (${archiveId}, ${entityType}, ${r['id'] as string}, ${p['id'] as string},
                    ${JSON.stringify(r)}::jsonb, ${tenantId})
          `;
          totalArchived++;
        }

        results.push({ entityType, recordsArchived: oldRecords.length });
      }

      return reply.send({ totalArchived, details: results });
    },
  );

  // GET /archive/records
  fastify.get(
    `${API_V1_PREFIX}/archive/records`,
    {
      schema: { description: 'List archived records', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(SYS_ARCHIVE_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { entityType } = request.query as Record<string, string | undefined>;
      let q = `SELECT id, entity_type, entity_id, archived_at, archive_policy_id FROM archived_records WHERE tenant_id = $1`;
      const p: unknown[] = [tenantId];
      if (entityType) { q += ` AND entity_type = $${p.length + 1}`; p.push(entityType); }
      q += ` ORDER BY archived_at DESC LIMIT 500`;
      return reply.send(await fastify.sql.unsafe(q, p as (string | number | boolean | null)[] ));
    },
  );

  // ---- Master Data Governance ----

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/mdg/change-requests`,
    {
      schema: { description: 'Submit master data change request', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(MDG_REQUEST_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['entityType']) throw new ValidationError({ detail: 'entityType is required.' });
      if (!b['changeType']) throw new ValidationError({ detail: 'changeType is required.' });
      if (!b['proposedData']) throw new ValidationError({ detail: 'proposedData is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO mdg_change_requests (id, entity_type, entity_id, change_type, proposed_data, status, requested_by, tenant_id)
        VALUES (${id}, ${b['entityType'] as string}, ${(b['entityId'] as string) ?? null},
                ${b['changeType'] as string}, ${JSON.stringify(b['proposedData'])}::jsonb,
                'pending', ${request.user.sub}, ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM mdg_change_requests WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  fastify.get(
    `${API_V1_PREFIX}/mdg/change-requests`,
    {
      schema: { description: 'List change requests', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(MDG_REQUEST_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { status, entityType } = request.query as Record<string, string | undefined>;
      let q = `SELECT * FROM mdg_change_requests WHERE tenant_id = $1`;
      const p: unknown[] = [tenantId];
      if (status) { q += ` AND status = $${p.length + 1}`; p.push(status); }
      if (entityType) { q += ` AND entity_type = $${p.length + 1}`; p.push(entityType); }
      q += ` ORDER BY created_at DESC`;
      return reply.send(await fastify.sql.unsafe(q, p as (string | number | boolean | null)[] ));
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/mdg/change-requests/:id`,
    {
      schema: { description: 'Change request detail', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(MDG_REQUEST_READ)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM mdg_change_requests WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Change request not found.' });
      return reply.send(rows[0]);
    },
  );

  // POST /mdg/change-requests/:id/approve — approve + apply changes
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/mdg/change-requests/:id/approve`,
    {
      schema: { description: 'Approve and apply master data change', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(MDG_REQUEST_APPROVE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const res = await fastify.sql`
        UPDATE mdg_change_requests SET status = 'approved', approved_by = ${request.user.sub}
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status = 'pending'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Change request not found or not pending.' });

      // Apply the change
      const cr = res[0] as Record<string, unknown>;
      const entityType = cr['entity_type'] as string;
      const changeType = cr['change_type'] as string;
      const proposedData = cr['proposed_data'] as Record<string, unknown>;

      if (entityType === 'product' && changeType === 'update' && cr['entity_id']) {
        const setClauses: string[] = [];
        const values: unknown[] = [];
        for (const [key, val] of Object.entries(proposedData)) {
          values.push(val);
          setClauses.push(`${key} = $${values.length + 2}`);
        }
        if (setClauses.length > 0) {
          await fastify.sql.unsafe(
            `UPDATE products SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2`,
            [cr['entity_id'] as string, tenantId, ...values] as (string | number | boolean | null)[],
          );
        }
      } else if (entityType === 'contact' && changeType === 'update' && cr['entity_id']) {
        const setClauses: string[] = [];
        const values: unknown[] = [];
        for (const [key, val] of Object.entries(proposedData)) {
          values.push(val);
          setClauses.push(`${key} = $${values.length + 2}`);
        }
        if (setClauses.length > 0) {
          await fastify.sql.unsafe(
            `UPDATE contacts SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2`,
            [cr['entity_id'] as string, tenantId, ...values] as (string | number | boolean | null)[],
          );
        }
      }

      return reply.send(res[0]);
    },
  );

  // POST /mdg/change-requests/:id/reject
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/mdg/change-requests/:id/reject`,
    {
      schema: { description: 'Reject master data change', tags: ['system'] },
      preHandler: [requireAuth, requirePermission(MDG_REQUEST_APPROVE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        UPDATE mdg_change_requests SET status = 'rejected', approved_by = ${request.user.sub}
        WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} AND status = 'pending'
        RETURNING *
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Change request not found or not pending.' });
      return reply.send(res[0]);
    },
  );
}
