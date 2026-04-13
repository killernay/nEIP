/**
 * Document Management System (DMS) routes:
 *   POST   /api/v1/documents/upload              — upload document
 *   GET    /api/v1/documents/:entityType/:entityId — list documents for entity
 *   GET    /api/v1/documents/:id                  — document detail
 *   DELETE /api/v1/documents/:id                  — delete document
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  DMS_DOCUMENT_CREATE, DMS_DOCUMENT_READ, DMS_DOCUMENT_DELETE,
} from '../../lib/permissions.js';
import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

export async function dmsRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /documents/upload
  fastify.post(
    `${API_V1_PREFIX}/documents/upload`,
    {
      schema: { description: 'Upload document attachment', tags: ['dms'] },
      preHandler: [requireAuth, requirePermission(DMS_DOCUMENT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const data = await request.file();
      if (!data) throw new ValidationError({ detail: 'File is required.' });

      const entityType = (data.fields['entityType'] as { value: string } | undefined)?.value;
      const entityId = (data.fields['entityId'] as { value: string } | undefined)?.value;
      if (!entityType) throw new ValidationError({ detail: 'entityType is required.' });
      if (!entityId) throw new ValidationError({ detail: 'entityId is required.' });

      const buffer = await data.toBuffer();
      const id = crypto.randomUUID();
      const storagePath = join('uploads', tenantId, entityType, entityId, `${id}-${data.filename}`);

      // Ensure directory exists
      const dir = join('uploads', tenantId, entityType, entityId);
      await mkdir(dir, { recursive: true });
      await writeFile(storagePath, buffer);

      // Get next version
      const verRows = await fastify.sql`
        SELECT COALESCE(MAX(version), 0) + 1 as next_version
        FROM document_attachments
        WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND tenant_id = ${tenantId}
      `;
      const version = (verRows[0] as Record<string, unknown>)['next_version'] as number;

      await fastify.sql`
        INSERT INTO document_attachments (id, entity_type, entity_id, file_name, file_type, file_size, storage_path, version, uploaded_by, tenant_id)
        VALUES (${id}, ${entityType}, ${entityId}, ${data.filename}, ${data.mimetype}, ${buffer.length},
                ${storagePath}, ${version}, ${request.user.sub}, ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM document_attachments WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  // GET /documents/:entityType/:entityId
  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    `${API_V1_PREFIX}/documents/:entityType/:entityId`,
    {
      schema: { description: 'List documents for entity', tags: ['dms'] },
      preHandler: [requireAuth, requirePermission(DMS_DOCUMENT_READ)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM document_attachments
        WHERE entity_type = ${request.params.entityType}
          AND entity_id = ${request.params.entityId}
          AND tenant_id = ${request.user.tenantId}
        ORDER BY version DESC
      `;
      return reply.send(rows);
    },
  );

  // GET /documents/:id (single document detail)
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/documents/detail/:id`,
    {
      schema: { description: 'Document detail', tags: ['dms'] },
      preHandler: [requireAuth, requirePermission(DMS_DOCUMENT_READ)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM document_attachments WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Document not found.' });
      return reply.send(rows[0]);
    },
  );

  // DELETE /documents/:id
  fastify.delete<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/documents/:id`,
    {
      schema: { description: 'Delete document', tags: ['dms'] },
      preHandler: [requireAuth, requirePermission(DMS_DOCUMENT_DELETE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        DELETE FROM document_attachments WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} RETURNING id
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'Document not found.' });
      return reply.status(204).send();
    },
  );
}
