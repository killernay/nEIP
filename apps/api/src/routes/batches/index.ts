/**
 * Batch / Serial Tracking routes (Phase 5.5):
 *   POST /api/v1/batches                    — create batch
 *   GET  /api/v1/batches                    — list batches
 *   GET  /api/v1/batches/:id               — get batch detail
 *   POST /api/v1/serial-numbers             — create serial number
 *   GET  /api/v1/serial-numbers             — list serial numbers
 *   PUT  /api/v1/serial-numbers/:id/status  — update serial status
 *   GET  /api/v1/inventory/trace/:batchId   — trace batch forward (find customers)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  INV_PRODUCT_READ,
  INV_PRODUCT_CREATE,
  INV_MOVEMENT_READ,
} from '../../lib/permissions.js';

interface BatchRow {
  id: string;
  product_id: string;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface SerialRow {
  id: string;
  product_id: string;
  serial_number: string;
  batch_id: string | null;
  status: string;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapBatch(r: BatchRow) {
  return {
    id: r.id,
    productId: r.product_id,
    batchNumber: r.batch_number,
    manufactureDate: r.manufacture_date,
    expiryDate: r.expiry_date,
    createdAt: toISO(r.created_at),
  };
}

function mapSerial(r: SerialRow) {
  return {
    id: r.id,
    productId: r.product_id,
    serialNumber: r.serial_number,
    batchId: r.batch_id,
    status: r.status,
    createdAt: toISO(r.created_at),
  };
}

export async function batchRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /batches
  fastify.post<{ Body: { productId: string; batchNumber: string; manufactureDate?: string; expiryDate?: string } }>(
    `${API_V1_PREFIX}/batches`,
    {
      schema: {
        description: 'Create a batch',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['productId', 'batchNumber'],
          properties: {
            productId: { type: 'string' },
            batchNumber: { type: 'string' },
            manufactureDate: { type: 'string', format: 'date' },
            expiryDate: { type: 'string', format: 'date' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(INV_PRODUCT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { productId, batchNumber, manufactureDate, expiryDate } = request.body;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO batches (id, product_id, batch_number, manufacture_date, expiry_date, tenant_id)
        VALUES (${id}, ${productId}, ${batchNumber}, ${manufactureDate ?? null}, ${expiryDate ?? null}, ${tenantId})
      `;

      const rows = await fastify.sql<[BatchRow]>`SELECT * FROM batches WHERE id = ${id}`;
      return reply.status(201).send(mapBatch(rows[0]));
    },
  );

  // GET /batches
  fastify.get<{ Querystring: { productId?: string } }>(
    `${API_V1_PREFIX}/batches`,
    {
      schema: {
        description: 'List batches',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
        querystring: { type: 'object', properties: { productId: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(INV_PRODUCT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { productId } = request.query;

      let rows: BatchRow[];
      if (productId) {
        rows = await fastify.sql<BatchRow[]>`
          SELECT * FROM batches WHERE tenant_id = ${tenantId} AND product_id = ${productId} ORDER BY created_at DESC
        `;
      } else {
        rows = await fastify.sql<BatchRow[]>`
          SELECT * FROM batches WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 100
        `;
      }
      return reply.send({ items: rows.map(mapBatch), total: rows.length });
    },
  );

  // GET /batches/:id
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/batches/:id`,
    {
      schema: {
        description: 'Get batch detail with serial numbers',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(INV_PRODUCT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const row = await fastify.sql<[BatchRow?]>`
        SELECT * FROM batches WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!row[0]) throw new NotFoundError({ detail: 'Batch not found.' });

      const serials = await fastify.sql<SerialRow[]>`
        SELECT * FROM serial_numbers WHERE batch_id = ${request.params.id} AND tenant_id = ${tenantId}
      `;

      return reply.send({
        ...mapBatch(row[0]),
        serialNumbers: serials.map(mapSerial),
      });
    },
  );

  // POST /serial-numbers
  fastify.post<{ Body: { productId: string; serialNumber: string; batchId?: string } }>(
    `${API_V1_PREFIX}/serial-numbers`,
    {
      schema: {
        description: 'Create a serial number',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['productId', 'serialNumber'],
          properties: {
            productId: { type: 'string' },
            serialNumber: { type: 'string' },
            batchId: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(INV_PRODUCT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { productId, serialNumber, batchId } = request.body;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO serial_numbers (id, product_id, serial_number, batch_id, status, tenant_id)
        VALUES (${id}, ${productId}, ${serialNumber}, ${batchId ?? null}, 'available', ${tenantId})
      `;

      const rows = await fastify.sql<[SerialRow]>`SELECT * FROM serial_numbers WHERE id = ${id}`;
      return reply.status(201).send(mapSerial(rows[0]));
    },
  );

  // GET /serial-numbers
  fastify.get<{ Querystring: { productId?: string; status?: string } }>(
    `${API_V1_PREFIX}/serial-numbers`,
    {
      schema: {
        description: 'List serial numbers',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            status: { type: 'string', enum: ['available', 'sold', 'returned'] },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(INV_PRODUCT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { productId, status } = request.query;

      let rows: SerialRow[];
      if (productId && status) {
        rows = await fastify.sql<SerialRow[]>`
          SELECT * FROM serial_numbers WHERE tenant_id = ${tenantId} AND product_id = ${productId} AND status = ${status} ORDER BY serial_number
        `;
      } else if (productId) {
        rows = await fastify.sql<SerialRow[]>`
          SELECT * FROM serial_numbers WHERE tenant_id = ${tenantId} AND product_id = ${productId} ORDER BY serial_number
        `;
      } else {
        rows = await fastify.sql<SerialRow[]>`
          SELECT * FROM serial_numbers WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT 100
        `;
      }
      return reply.send({ items: rows.map(mapSerial), total: rows.length });
    },
  );

  // PUT /serial-numbers/:id/status
  fastify.put<{ Params: { id: string }; Body: { status: string } }>(
    `${API_V1_PREFIX}/serial-numbers/:id/status`,
    {
      schema: {
        description: 'Update serial number status',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: ['available', 'sold', 'returned'] } },
        },
      },
      preHandler: [requireAuth, requirePermission(INV_PRODUCT_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const row = await fastify.sql<[SerialRow?]>`
        SELECT * FROM serial_numbers WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!row[0]) throw new NotFoundError({ detail: 'Serial number not found.' });

      await fastify.sql`
        UPDATE serial_numbers SET status = ${request.body.status}, updated_at = NOW()
        WHERE id = ${request.params.id}
      `;

      const updated = await fastify.sql<[SerialRow]>`SELECT * FROM serial_numbers WHERE id = ${request.params.id}`;
      return reply.send(mapSerial(updated[0]));
    },
  );

  // GET /inventory/trace/:batchId — trace batch forward to find all customers
  fastify.get<{ Params: { batchId: string } }>(
    `${API_V1_PREFIX}/inventory/trace/:batchId`,
    {
      schema: {
        description: 'Trace a batch forward — find all customers who received items from this batch',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['batchId'], properties: { batchId: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(INV_MOVEMENT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const { batchId } = request.params;

      // Verify batch exists
      const batch = await fastify.sql<[BatchRow?]>`
        SELECT * FROM batches WHERE id = ${batchId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!batch[0]) throw new NotFoundError({ detail: 'Batch not found.' });

      // Find all outbound stock movements linked to this batch
      const movements = await fastify.sql<Array<{
        id: string;
        movement_type: string;
        quantity: number;
        reference_type: string | null;
        reference_id: string | null;
        created_at: Date | string;
      }>>`
        SELECT id, movement_type, quantity, reference_type, reference_id, created_at
        FROM stock_movements
        WHERE tenant_id = ${tenantId} AND batch_id = ${batchId} AND quantity < 0
        ORDER BY created_at
      `;

      // Trace delivery notes to find customers
      const deliveryNoteIds = movements
        .filter((m) => m.reference_type === 'delivery_note' && m.reference_id)
        .map((m) => m.reference_id as string);

      let customers: Array<{ deliveryNoteId: string; customerId: string; customerName: string }> = [];
      if (deliveryNoteIds.length > 0) {
        customers = await fastify.sql<typeof customers>`
          SELECT dn.id AS delivery_note_id,
            COALESCE(c.id, 'unknown') AS customer_id,
            COALESCE(c.name, 'Unknown') AS customer_name
          FROM delivery_notes dn
          LEFT JOIN contacts c ON c.id = dn.customer_id
          WHERE dn.id = ANY(${deliveryNoteIds})
        `.catch(() => []);
      }

      return reply.send({
        batchId,
        batchNumber: batch[0].batch_number,
        productId: batch[0].product_id,
        totalOutboundMovements: movements.length,
        movements: movements.map((m) => ({
          id: m.id,
          type: m.movement_type,
          quantity: m.quantity,
          referenceType: m.reference_type,
          referenceId: m.reference_id,
          createdAt: toISO(m.created_at),
        })),
        affectedCustomers: customers.map((c) => ({
          deliveryNoteId: c.deliveryNoteId,
          customerId: c.customerId,
          customerName: c.customerName,
        })),
      });
    },
  );
}
