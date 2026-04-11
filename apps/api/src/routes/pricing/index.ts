/**
 * Pricing Engine routes:
 *   POST   /api/v1/price-lists              — create price list
 *   GET    /api/v1/price-lists              — list price lists
 *   GET    /api/v1/price-lists/:id          — get detail
 *   PUT    /api/v1/price-lists/:id          — update
 *   DELETE /api/v1/price-lists/:id          — deactivate
 *   POST   /api/v1/price-lists/:id/items    — add item
 *   GET    /api/v1/price-lists/:id/items    — list items
 *   DELETE /api/v1/price-lists/:id/items/:itemId — remove item
 *   GET    /api/v1/pricing/resolve          — resolve price for product+customer+qty
 *
 * Phase 3.1 — Pricing Engine
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import { PRICING_READ, PRICING_MANAGE } from '../../lib/permissions.js';

interface IdParams { id: string; }
interface ItemIdParams { id: string; itemId: string; }

interface PriceListRow {
  id: string; name: string; currency: string;
  valid_from: string | null; valid_to: string | null;
  is_active: boolean; tenant_id: string;
  created_at: Date | string; updated_at: Date | string;
}

interface PriceListItemRow {
  id: string; price_list_id: string; product_id: string;
  unit_price_satang: bigint; min_quantity: number; discount_percent: number;
  created_at: Date | string; updated_at: Date | string;
}

interface CountRow { count: string; }

export async function pricingRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /price-lists
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/price-lists`,
    {
      schema: { description: 'Create a price list', tags: ['pricing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_MANAGE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      if (!b['name']) throw new ValidationError({ detail: 'name is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO price_lists (id, name, currency, valid_from, valid_to, tenant_id)
        VALUES (
          ${id},
          ${b['name'] as string},
          ${(b['currency'] as string) ?? 'THB'},
          ${(b['validFrom'] as string) ?? null},
          ${(b['validTo'] as string) ?? null},
          ${tenantId}
        )
      `;
      const rows = await fastify.sql<PriceListRow[]>`SELECT * FROM price_lists WHERE id = ${id}`;
      return reply.status(201).send(mapPriceList(rows[0]!));
    },
  );

  // GET /price-lists
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/price-lists`,
    {
      schema: { description: 'List price lists', tags: ['pricing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);

      const countRows = await fastify.sql<CountRow[]>`
        SELECT COUNT(*)::text as count FROM price_lists WHERE tenant_id = ${tenantId} AND is_active = TRUE
      `;
      const rows = await fastify.sql<PriceListRow[]>`
        SELECT * FROM price_lists WHERE tenant_id = ${tenantId} AND is_active = TRUE
        ORDER BY name LIMIT ${limit} OFFSET ${offset}
      `;
      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.send({ items: rows.map(mapPriceList), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // GET /price-lists/:id
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/price-lists/:id`,
    {
      schema: { description: 'Get price list detail', tags: ['pricing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<PriceListRow[]>`
        SELECT * FROM price_lists WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Price list ${id} not found.` });

      const items = await fastify.sql<PriceListItemRow[]>`
        SELECT * FROM price_list_items WHERE price_list_id = ${id} ORDER BY product_id
      `;
      return reply.send({ ...mapPriceList(rows[0]), items: items.map(mapPriceListItem) });
    },
  );

  // PUT /price-lists/:id
  fastify.put<{ Params: IdParams; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/price-lists/:id`,
    {
      schema: { description: 'Update price list', tags: ['pricing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      const rows = await fastify.sql<PriceListRow[]>`
        UPDATE price_lists SET
          name = COALESCE(${(b['name'] as string) ?? null}, name),
          currency = COALESCE(${(b['currency'] as string) ?? null}, currency),
          valid_from = COALESCE(${(b['validFrom'] as string) ?? null}, valid_from),
          valid_to = COALESCE(${(b['validTo'] as string) ?? null}, valid_to),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Price list ${id} not found.` });
      return reply.send(mapPriceList(rows[0]));
    },
  );

  // DELETE /price-lists/:id (soft)
  fastify.delete<{ Params: IdParams }>(
    `${API_V1_PREFIX}/price-lists/:id`,
    {
      schema: { description: 'Deactivate price list', tags: ['pricing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;
      const rows = await fastify.sql<PriceListRow[]>`
        UPDATE price_lists SET is_active = FALSE, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Price list ${id} not found.` });
      return reply.send({ id, deleted: true });
    },
  );

  // POST /price-lists/:id/items
  fastify.post<{ Params: IdParams; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/price-lists/:id/items`,
    {
      schema: { description: 'Add item to price list', tags: ['pricing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      // Verify price list exists
      const plRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM price_lists WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!plRows[0]) throw new NotFoundError({ detail: `Price list ${id} not found.` });

      if (!b['productId'] || !b['unitPriceSatang']) {
        throw new ValidationError({ detail: 'productId and unitPriceSatang are required.' });
      }

      const itemId = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO price_list_items (id, price_list_id, product_id, unit_price_satang, min_quantity, discount_percent)
        VALUES (
          ${itemId}, ${id},
          ${b['productId'] as string},
          ${b['unitPriceSatang'] as string}::bigint,
          ${Number(b['minQuantity'] ?? 1)},
          ${Number(b['discountPercent'] ?? 0)}
        )
      `;
      const rows = await fastify.sql<PriceListItemRow[]>`SELECT * FROM price_list_items WHERE id = ${itemId}`;
      return reply.status(201).send(mapPriceListItem(rows[0]!));
    },
  );

  // GET /price-lists/:id/items
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/price-lists/:id/items`,
    {
      schema: { description: 'List items in price list', tags: ['pricing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const items = await fastify.sql<PriceListItemRow[]>`
        SELECT * FROM price_list_items WHERE price_list_id = ${id} ORDER BY product_id
      `;
      return reply.send({ items: items.map(mapPriceListItem) });
    },
  );

  // DELETE /price-lists/:id/items/:itemId
  fastify.delete<{ Params: ItemIdParams }>(
    `${API_V1_PREFIX}/price-lists/:id/items/:itemId`,
    {
      schema: { description: 'Remove item from price list', tags: ['pricing'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { itemId } = request.params;
      await fastify.sql`DELETE FROM price_list_items WHERE id = ${itemId}`;
      return reply.send({ id: itemId, deleted: true });
    },
  );

  // GET /pricing/resolve — resolve price for product + customer + quantity
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/pricing/resolve`,
    {
      schema: {
        description: 'Resolve price: customer-specific → price list → product base price',
        tags: ['pricing'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['productId'],
          properties: {
            productId: { type: 'string' },
            customerId: { type: 'string' },
            quantity: { type: 'number', default: 1 },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(PRICING_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const productId = request.query['productId']!;
      const customerId = request.query['customerId'];
      const quantity = parseFloat(request.query['quantity'] ?? '1');

      const resolved = await resolvePrice(fastify, tenantId, productId, customerId, quantity);
      return reply.send(resolved);
    },
  );
}

/**
 * resolvePrice — Pricing cascade:
 *   1. Customer-specific price list (via customer_price_lists)
 *   2. Any active price list with matching product
 *   3. Product base selling_price_satang
 */
async function resolvePrice(
  fastify: FastifyInstance,
  tenantId: string,
  productId: string,
  customerId: string | undefined,
  quantity: number,
) {
  const today = new Date().toISOString().slice(0, 10);

  // 1. Customer-specific price list
  if (customerId) {
    const custPrice = await fastify.sql<{ unit_price_satang: string; discount_percent: number; price_list_name: string }[]>`
      SELECT pli.unit_price_satang::text, pli.discount_percent, pl.name as price_list_name
      FROM customer_price_lists cpl
      JOIN price_lists pl ON pl.id = cpl.price_list_id
      JOIN price_list_items pli ON pli.price_list_id = pl.id
      WHERE cpl.contact_id = ${customerId}
        AND cpl.tenant_id = ${tenantId}
        AND pl.is_active = TRUE
        AND pli.product_id = ${productId}
        AND pli.min_quantity <= ${quantity}
        AND (pl.valid_from IS NULL OR pl.valid_from <= ${today})
        AND (pl.valid_to IS NULL OR pl.valid_to >= ${today})
      ORDER BY cpl.priority DESC, pli.min_quantity DESC
      LIMIT 1
    `;
    if (custPrice[0]) {
      const base = BigInt(custPrice[0].unit_price_satang);
      const discount = custPrice[0].discount_percent;
      const finalPrice = discount > 0
        ? base - (base * BigInt(Math.round(discount * 100))) / 10000n
        : base;
      return {
        unitPriceSatang: finalPrice.toString(),
        source: 'customer_price_list',
        priceListName: custPrice[0].price_list_name,
        discountPercent: discount,
      };
    }
  }

  // 2. Any active price list
  const plPrice = await fastify.sql<{ unit_price_satang: string; discount_percent: number; price_list_name: string }[]>`
    SELECT pli.unit_price_satang::text, pli.discount_percent, pl.name as price_list_name
    FROM price_list_items pli
    JOIN price_lists pl ON pl.id = pli.price_list_id
    WHERE pl.tenant_id = ${tenantId}
      AND pl.is_active = TRUE
      AND pli.product_id = ${productId}
      AND pli.min_quantity <= ${quantity}
      AND (pl.valid_from IS NULL OR pl.valid_from <= ${today})
      AND (pl.valid_to IS NULL OR pl.valid_to >= ${today})
    ORDER BY pli.min_quantity DESC
    LIMIT 1
  `;
  if (plPrice[0]) {
    const base = BigInt(plPrice[0].unit_price_satang);
    const discount = plPrice[0].discount_percent;
    const finalPrice = discount > 0
      ? base - (base * BigInt(Math.round(discount * 100))) / 10000n
      : base;
    return {
      unitPriceSatang: finalPrice.toString(),
      source: 'price_list',
      priceListName: plPrice[0].price_list_name,
      discountPercent: discount,
    };
  }

  // 3. Product base price
  const product = await fastify.sql<{ selling_price_satang: number }[]>`
    SELECT selling_price_satang FROM products WHERE id = ${productId} AND tenant_id = ${tenantId} LIMIT 1
  `;
  if (!product[0]) {
    return { unitPriceSatang: '0', source: 'not_found', priceListName: null, discountPercent: 0 };
  }
  return {
    unitPriceSatang: product[0].selling_price_satang.toString(),
    source: 'product_base',
    priceListName: null,
    discountPercent: 0,
  };
}

function mapPriceList(r: PriceListRow) {
  return {
    id: r.id, name: r.name, currency: r.currency,
    validFrom: r.valid_from, validTo: r.valid_to,
    isActive: r.is_active,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}

function mapPriceListItem(r: PriceListItemRow) {
  return {
    id: r.id, priceListId: r.price_list_id, productId: r.product_id,
    unitPriceSatang: r.unit_price_satang.toString(),
    minQuantity: r.min_quantity, discountPercent: r.discount_percent,
    createdAt: toISO(r.created_at), updatedAt: toISO(r.updated_at),
  };
}
