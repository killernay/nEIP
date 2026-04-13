/**
 * EDI (Electronic Data Interchange) routes:
 *   POST /api/v1/edi/receive                        — receive/parse inbound EDI
 *   POST /api/v1/edi/send/:documentType/:documentId — generate outbound EDI
 *   GET  /api/v1/edi/messages                       — list EDI messages
 *   GET  /api/v1/edi/messages/:id                   — EDI message detail
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { EDI_MESSAGE_CREATE, EDI_MESSAGE_READ } from '../../lib/permissions.js';

export async function ediRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /edi/receive — parse incoming EDI message
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/edi/receive`,
    {
      schema: { description: 'Receive and parse inbound EDI message', tags: ['edi'] },
      preHandler: [requireAuth, requirePermission(EDI_MESSAGE_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['messageType']) throw new ValidationError({ detail: 'messageType is required.' });
      if (!b['content']) throw new ValidationError({ detail: 'content is required.' });

      const id = crypto.randomUUID();
      try {
        await fastify.sql`
          INSERT INTO edi_messages (id, message_type, direction, partner_id, status, content, tenant_id)
          VALUES (${id}, ${b['messageType'] as string}, 'inbound',
                  ${(b['partnerId'] as string) ?? null}, 'received',
                  ${JSON.stringify(b['content'])}::jsonb, ${tenantId})
        `;

        // Process the message based on type
        await fastify.sql`
          UPDATE edi_messages SET status = 'processed' WHERE id = ${id}
        `;
      } catch (err) {
        await fastify.sql`
          UPDATE edi_messages SET status = 'error', error_message = ${(err as Error).message}
          WHERE id = ${id}
        `;
      }

      const rows = await fastify.sql`SELECT * FROM edi_messages WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  // POST /edi/send/:documentType/:documentId — generate outbound EDI
  fastify.post<{ Params: { documentType: string; documentId: string } }>(
    `${API_V1_PREFIX}/edi/send/:documentType/:documentId`,
    {
      schema: { description: 'Generate and send outbound EDI message', tags: ['edi'] },
      preHandler: [requireAuth, requirePermission(EDI_MESSAGE_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { documentType, documentId } = request.params;

      // Map document types to EDI message types
      const typeMap: Record<string, string> = {
        'purchase-order': 'ORDERS',
        'invoice': 'INVOIC',
        'delivery-note': 'DESADV',
      };
      const messageType = typeMap[documentType];
      if (!messageType) throw new ValidationError({ detail: `Unsupported document type: ${documentType}` });

      // Fetch the document data
      let docData: Record<string, unknown> | undefined;
      if (documentType === 'invoice') {
        const rows = await fastify.sql`SELECT * FROM invoices WHERE id = ${documentId} AND tenant_id = ${tenantId} LIMIT 1`;
        docData = rows[0] as Record<string, unknown> | undefined;
      } else if (documentType === 'purchase-order') {
        const rows = await fastify.sql`SELECT * FROM purchase_orders WHERE id = ${documentId} AND tenant_id = ${tenantId} LIMIT 1`;
        docData = rows[0] as Record<string, unknown> | undefined;
      } else if (documentType === 'delivery-note') {
        const rows = await fastify.sql`SELECT * FROM delivery_orders WHERE id = ${documentId} AND tenant_id = ${tenantId} LIMIT 1`;
        docData = rows[0] as Record<string, unknown> | undefined;
      }
      if (!docData) throw new NotFoundError({ detail: `${documentType} ${documentId} not found.` });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO edi_messages (id, message_type, direction, partner_id, status, content, tenant_id)
        VALUES (${id}, ${messageType}, 'outbound',
                ${(docData['customer_id'] as string) ?? (docData['vendor_id'] as string) ?? null},
                'processed', ${JSON.stringify(docData)}::jsonb, ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM edi_messages WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  // GET /edi/messages
  fastify.get(
    `${API_V1_PREFIX}/edi/messages`,
    {
      schema: { description: 'List EDI messages', tags: ['edi'] },
      preHandler: [requireAuth, requirePermission(EDI_MESSAGE_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { direction, status, messageType } = request.query as Record<string, string | undefined>;
      let q = `SELECT * FROM edi_messages WHERE tenant_id = $1`;
      const p: unknown[] = [tenantId];
      if (direction) { q += ` AND direction = $${p.length + 1}`; p.push(direction); }
      if (status) { q += ` AND status = $${p.length + 1}`; p.push(status); }
      if (messageType) { q += ` AND message_type = $${p.length + 1}`; p.push(messageType); }
      q += ` ORDER BY created_at DESC`;
      return reply.send(await fastify.sql.unsafe(q, p as (string | number | boolean | null)[]));
    },
  );

  // GET /edi/messages/:id
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/edi/messages/:id`,
    {
      schema: { description: 'EDI message detail', tags: ['edi'] },
      preHandler: [requireAuth, requirePermission(EDI_MESSAGE_READ)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM edi_messages WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'EDI message not found.' });
      return reply.send(rows[0]);
    },
  );
}
