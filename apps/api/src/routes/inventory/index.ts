/**
 * Inventory routes — Products, Warehouses, Stock Movements, Stock Levels, Valuation.
 *
 * Routes:
 *   POST /api/v1/products                    — create product
 *   GET  /api/v1/products                    — list products
 *   PUT  /api/v1/products/:id                — update product
 *   POST /api/v1/warehouses                  — create warehouse
 *   GET  /api/v1/warehouses                  — list warehouses
 *   PUT  /api/v1/warehouses/:id              — update warehouse
 *   POST /api/v1/stock-movements             — record movement
 *   GET  /api/v1/stock-movements             — movement history
 *   GET  /api/v1/stock-levels                — current stock by product × warehouse
 *   GET  /api/v1/stock-levels/:productId     — single product across warehouses
 *   GET  /api/v1/inventory/valuation         — stock valuation report
 *   GET  /api/v1/inventory/low-stock         — products below min_stock_level
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';

// ---------------------------------------------------------------------------
// Permission constants (inline — not yet in lib/permissions.ts)
// ---------------------------------------------------------------------------
const INV_PRODUCT_CREATE = 'inventory:product:create' as const;
const INV_PRODUCT_READ   = 'inventory:product:read'   as const;
const INV_PRODUCT_UPDATE = 'inventory:product:update' as const;
const INV_WH_CREATE      = 'inventory:warehouse:create' as const;
const INV_WH_READ        = 'inventory:warehouse:read'   as const;
const INV_WH_UPDATE      = 'inventory:warehouse:update' as const;
const INV_MOV_CREATE     = 'inventory:movement:create' as const;
const INV_MOV_READ       = 'inventory:movement:read'   as const;
const INV_LEVEL_READ     = 'inventory:level:read'      as const;
const INV_VAL_READ       = 'inventory:valuation:read'  as const;

// ---------------------------------------------------------------------------
// Row interfaces
// ---------------------------------------------------------------------------

interface ProductRow {
  id: string; sku: string; name_th: string; name_en: string;
  description: string | null; category: string | null; unit: string;
  cost_price_satang: number; selling_price_satang: number;
  min_stock_level: number; is_active: boolean; gl_account_id: string | null;
  tenant_id: string; created_at: Date | string; updated_at: Date | string;
}

interface WarehouseRow {
  id: string; code: string; name: string; address: string | null;
  is_default: boolean; tenant_id: string;
  created_at: Date | string; updated_at: Date | string;
}

interface StockMovementRow {
  id: string; product_id: string; warehouse_id: string;
  movement_type: string; quantity: number;
  reference_type: string | null; reference_id: string | null;
  batch_number: string | null; notes: string | null;
  balance_after: number; unit_cost_satang: number;
  tenant_id: string; created_by: string;
  created_at: Date | string; updated_at: Date | string;
}

interface StockLevelRow {
  product_id: string; warehouse_id: string;
  quantity_on_hand: number; quantity_reserved: number; quantity_available: number;
}

interface CountRow { count: string; }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapProduct(p: ProductRow) {
  return {
    id: p.id, sku: p.sku, nameTh: p.name_th, nameEn: p.name_en,
    description: p.description, category: p.category, unit: p.unit,
    costPriceSatang: p.cost_price_satang, sellingPriceSatang: p.selling_price_satang,
    minStockLevel: p.min_stock_level, isActive: p.is_active,
    glAccountId: p.gl_account_id,
    vatCategory: (p as unknown as Record<string, unknown>)['vat_category'] ?? 'standard',
    createdAt: toISO(p.created_at), updatedAt: toISO(p.updated_at),
  };
}

function mapWarehouse(w: WarehouseRow) {
  return {
    id: w.id, code: w.code, name: w.name, address: w.address,
    isDefault: w.is_default,
    createdAt: toISO(w.created_at), updatedAt: toISO(w.updated_at),
  };
}

function mapMovement(m: StockMovementRow) {
  return {
    id: m.id, productId: m.product_id, warehouseId: m.warehouse_id,
    movementType: m.movement_type, quantity: m.quantity,
    referenceType: m.reference_type, referenceId: m.reference_id,
    batchNumber: m.batch_number, notes: m.notes,
    balanceAfter: m.balance_after, unitCostSatang: m.unit_cost_satang,
    createdBy: m.created_by,
    createdAt: toISO(m.created_at), updatedAt: toISO(m.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function inventoryRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // =========================================================================
  // PRODUCTS
  // =========================================================================

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/products`,
    {
      schema: {
        description: 'สร้างสินค้าหรือบริการใหม่ — Create a new product or service item',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_PRODUCT_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const id = crypto.randomUUID();

      if (!b['sku'] || !b['nameTh'] || !b['nameEn']) {
        throw new ValidationError({ detail: 'sku, nameTh, nameEn are required.' });
      }

      await fastify.sql`
        INSERT INTO products (id, sku, name_th, name_en, description, category, unit,
          cost_price_satang, selling_price_satang, min_stock_level, is_active, gl_account_id, vat_category, tenant_id)
        VALUES (
          ${id}, ${b['sku'] as string}, ${b['nameTh'] as string}, ${b['nameEn'] as string},
          ${(b['description'] as string | undefined) ?? null},
          ${(b['category'] as string | undefined) ?? null},
          ${(b['unit'] as string | undefined) ?? 'ชิ้น'},
          ${Number(b['costPriceSatang'] ?? 0)},
          ${Number(b['sellingPriceSatang'] ?? 0)},
          ${Number(b['minStockLevel'] ?? 0)},
          ${b['isActive'] !== false},
          ${(b['glAccountId'] as string | undefined) ?? null},
          ${(b['vatCategory'] as string | undefined) ?? 'standard'},
          ${tenantId}
        )
      `;

      const rows = await fastify.sql<ProductRow[]>`
        SELECT * FROM products WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapProduct(rows[0]!));
    },
  );

  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/products`,
    {
      schema: {
        description: 'รายการสินค้าพร้อมตัวกรองและการค้นหา — List products with filters and search',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_PRODUCT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit  = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);
      const search = request.query['search'] ?? '';
      const activeOnly = request.query['activeOnly'] !== 'false';

      let rows: ProductRow[];
      let countRows: CountRow[];

      if (search) {
        const q = `%${search}%`;
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM products
          WHERE tenant_id = ${tenantId}
            AND is_active = ${activeOnly}
            AND (name_th ILIKE ${q} OR name_en ILIKE ${q} OR sku ILIKE ${q})
        `;
        rows = await fastify.sql<ProductRow[]>`
          SELECT * FROM products
          WHERE tenant_id = ${tenantId}
            AND is_active = ${activeOnly}
            AND (name_th ILIKE ${q} OR name_en ILIKE ${q} OR sku ILIKE ${q})
          ORDER BY name_en LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        countRows = await fastify.sql<CountRow[]>`
          SELECT COUNT(*)::text as count FROM products
          WHERE tenant_id = ${tenantId} AND is_active = ${activeOnly}
        `;
        rows = await fastify.sql<ProductRow[]>`
          SELECT * FROM products
          WHERE tenant_id = ${tenantId} AND is_active = ${activeOnly}
          ORDER BY name_en LIMIT ${limit} OFFSET ${offset}
        `;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({
        items: rows.map(mapProduct),
        total, limit, offset, hasMore: offset + limit < total,
      });
    },
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/products/:id`,
    {
      schema: {
        description: 'อัปเดตข้อมูลสินค้า — Update product information',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_PRODUCT_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      const existing = await fastify.sql<ProductRow[]>`
        SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Product ${id} not found.` });

      const rows = await fastify.sql<ProductRow[]>`
        UPDATE products SET
          sku                   = COALESCE(${(b['sku'] as string | undefined) ?? null}, sku),
          name_th               = COALESCE(${(b['nameTh'] as string | undefined) ?? null}, name_th),
          name_en               = COALESCE(${(b['nameEn'] as string | undefined) ?? null}, name_en),
          description           = COALESCE(${(b['description'] as string | undefined) ?? null}, description),
          category              = COALESCE(${(b['category'] as string | undefined) ?? null}, category),
          unit                  = COALESCE(${(b['unit'] as string | undefined) ?? null}, unit),
          cost_price_satang     = COALESCE(${b['costPriceSatang'] != null ? Number(b['costPriceSatang']) : null}, cost_price_satang),
          selling_price_satang  = COALESCE(${b['sellingPriceSatang'] != null ? Number(b['sellingPriceSatang']) : null}, selling_price_satang),
          min_stock_level       = COALESCE(${b['minStockLevel'] != null ? Number(b['minStockLevel']) : null}, min_stock_level),
          is_active             = COALESCE(${b['isActive'] != null ? Boolean(b['isActive']) : null}, is_active),
          gl_account_id         = COALESCE(${(b['glAccountId'] as string | undefined) ?? null}, gl_account_id),
          vat_category          = COALESCE(${(b['vatCategory'] as string | undefined) ?? null}, vat_category),
          updated_at            = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return reply.status(200).send(mapProduct(rows[0]!));
    },
  );

  // =========================================================================
  // WAREHOUSES
  // =========================================================================

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/warehouses`,
    {
      schema: {
        description: 'สร้างคลังสินค้าใหม่ — Create a new warehouse',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_WH_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;

      if (!b['code'] || !b['name']) {
        throw new ValidationError({ detail: 'code and name are required.' });
      }

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO warehouses (id, code, name, address, is_default, tenant_id)
        VALUES (
          ${id}, ${b['code'] as string}, ${b['name'] as string},
          ${(b['address'] as string | undefined) ?? null},
          ${b['isDefault'] === true},
          ${tenantId}
        )
      `;

      const rows = await fastify.sql<WarehouseRow[]>`
        SELECT * FROM warehouses WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapWarehouse(rows[0]!));
    },
  );

  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/warehouses`,
    {
      schema: {
        description: 'รายการคลังสินค้าทั้งหมด — List all warehouses',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_WH_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<WarehouseRow[]>`
        SELECT * FROM warehouses WHERE tenant_id = ${tenantId} ORDER BY name
      `;
      return reply.status(200).send({ items: rows.map(mapWarehouse), total: rows.length });
    },
  );

  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/warehouses/:id`,
    {
      schema: {
        description: 'อัปเดตข้อมูลคลังสินค้า — Update warehouse information',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_WH_UPDATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const b = request.body;
      const { tenantId } = request.user;

      const existing = await fastify.sql<WarehouseRow[]>`
        SELECT * FROM warehouses WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!existing[0]) throw new NotFoundError({ detail: `Warehouse ${id} not found.` });

      const rows = await fastify.sql<WarehouseRow[]>`
        UPDATE warehouses SET
          code       = COALESCE(${(b['code'] as string | undefined) ?? null}, code),
          name       = COALESCE(${(b['name'] as string | undefined) ?? null}, name),
          address    = COALESCE(${(b['address'] as string | undefined) ?? null}, address),
          is_default = COALESCE(${b['isDefault'] != null ? Boolean(b['isDefault']) : null}, is_default),
          updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return reply.status(200).send(mapWarehouse(rows[0]!));
    },
  );

  // =========================================================================
  // STOCK MOVEMENTS
  // =========================================================================

  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/stock-movements`,
    {
      schema: {
        description: 'บันทึกการเคลื่อนไหวของสต็อก (รับเข้า/จ่ายออก) — Record a stock movement (receipt or issue)',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_MOV_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId, sub: userId } = request.user;

      if (!b['productId'] || !b['warehouseId'] || !b['movementType'] || b['quantity'] == null) {
        throw new ValidationError({ detail: 'productId, warehouseId, movementType, quantity are required.' });
      }

      const qty = Number(b['quantity']);
      const movType = b['movementType'] as string;

      // Guard against integer overflow — PostgreSQL integer max is 2147483647
      // adjust type allows negative quantities
      if (movType === 'adjust') {
        if (!isFinite(qty) || Math.abs(qty) < 0.01 || Math.abs(qty) > 2_147_483_647) {
          throw new ValidationError({ detail: 'quantity must have absolute value between 0.01 and 2147483647.' });
        }
      } else {
        if (!isFinite(qty) || qty < 0.01 || qty > 2_147_483_647) {
          throw new ValidationError({ detail: 'quantity must be between 0.01 and 2147483647.' });
        }
      }

      const productId = b['productId'] as string;
      const warehouseId = b['warehouseId'] as string;
      const toWarehouseId = (b['toWarehouseId'] as string | undefined) ?? null;

      // Handle transfer type separately (INV-007)
      if (movType === 'transfer') {
        if (!toWarehouseId) {
          throw new ValidationError({ detail: 'toWarehouseId is required for transfer movements.' });
        }

        // Check source stock
        const srcRows = await fastify.sql<{ quantity_on_hand: number }[]>`
          SELECT COALESCE(quantity_on_hand, 0) as quantity_on_hand FROM stock_levels
          WHERE product_id = ${productId} AND warehouse_id = ${warehouseId} LIMIT 1
        `;
        const srcBalance = srcRows[0]?.quantity_on_hand ?? 0;
        if (srcBalance < qty) {
          throw new ConflictError({
            detail: `Insufficient stock for transfer from warehouse ${warehouseId}. Available: ${srcBalance}, requested: ${qty}.`,
          });
        }

        const srcNewBalance = srcBalance - qty;

        // Verify toWarehouse belongs to this tenant (INV-012)
        const toWhRows = await fastify.sql<{ id: string }[]>`
          SELECT id FROM warehouses WHERE id = ${toWarehouseId} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!toWhRows[0]) {
          throw new NotFoundError({ detail: `Destination warehouse ${toWarehouseId} not found.` });
        }

        const dstRows = await fastify.sql<{ quantity_on_hand: number }[]>`
          SELECT COALESCE(quantity_on_hand, 0) as quantity_on_hand FROM stock_levels
          WHERE product_id = ${productId} AND warehouse_id = ${toWarehouseId} LIMIT 1
        `;
        const dstBalance = dstRows[0]?.quantity_on_hand ?? 0;
        const dstNewBalance = dstBalance + qty;

        // Source movement (issue)
        const srcMovId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, balance_after, unit_cost_satang, tenant_id, created_by)
          VALUES (${srcMovId}, ${productId}, ${warehouseId}, 'transfer', ${-qty}, 'transfer', ${srcMovId}, ${srcNewBalance}, ${Number(b['unitCostSatang'] ?? 0)}, ${tenantId}, ${userId})
        `;
        await fastify.sql`
          INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available)
          VALUES (${productId}, ${warehouseId}, ${srcNewBalance}, 0, ${srcNewBalance})
          ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
            quantity_on_hand = stock_levels.quantity_on_hand - ${qty},
            quantity_available = stock_levels.quantity_available - ${qty}
        `;

        // Destination movement (receive)
        await fastify.sql`
          INSERT INTO stock_movements (id, product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, balance_after, unit_cost_satang, tenant_id, created_by)
          VALUES (${crypto.randomUUID()}, ${productId}, ${toWarehouseId}, 'transfer', ${qty}, 'transfer', ${srcMovId}, ${dstNewBalance}, ${Number(b['unitCostSatang'] ?? 0)}, ${tenantId}, ${userId})
        `;
        await fastify.sql`
          INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available)
          VALUES (${productId}, ${toWarehouseId}, ${dstNewBalance}, 0, ${dstNewBalance})
          ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
            quantity_on_hand = stock_levels.quantity_on_hand + ${qty},
            quantity_available = stock_levels.quantity_available + ${qty}
        `;

        const rows = await fastify.sql<StockMovementRow[]>`SELECT * FROM stock_movements WHERE id = ${srcMovId} LIMIT 1`;
        return reply.status(201).send({
          ...mapMovement(rows[0]!),
          toWarehouseId,
          sourceBalanceAfter: srcNewBalance,
          destinationBalanceAfter: dstNewBalance,
        });
      }

      // Compute signed quantity: issue are negative; adjust uses qty as-is (can be negative)
      const signedQty = (movType === 'issue') ? -Math.abs(qty) : qty;

      // Compute new balance
      const prevRows = await fastify.sql<{ quantity_on_hand: number }[]>`
        SELECT COALESCE(quantity_on_hand, 0) as quantity_on_hand
        FROM stock_levels
        WHERE product_id = ${productId}
          AND warehouse_id = ${warehouseId}
        LIMIT 1
      `;
      const prevBalance = prevRows[0]?.quantity_on_hand ?? 0;

      // INV-006: Check sufficient stock for issue movements
      if (movType === 'issue' && prevBalance < Math.abs(qty)) {
        throw new ConflictError({
          detail: `Insufficient stock for product ${productId} in warehouse ${warehouseId}. Available: ${prevBalance}, requested: ${Math.abs(qty)}.`,
        });
      }

      const newBalance = prevBalance + signedQty;

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO stock_movements (
          id, product_id, warehouse_id, movement_type, quantity,
          reference_type, reference_id, batch_number, notes,
          balance_after, unit_cost_satang, tenant_id, created_by
        ) VALUES (
          ${id},
          ${productId},
          ${warehouseId},
          ${movType},
          ${signedQty},
          ${(b['referenceType'] as string | undefined) ?? null},
          ${(b['referenceId'] as string | undefined) ?? null},
          ${(b['batchNumber'] as string | undefined) ?? null},
          ${(b['notes'] as string | undefined) ?? null},
          ${newBalance},
          ${Number(b['unitCostSatang'] ?? 0)},
          ${tenantId},
          ${userId}
        )
      `;

      // Upsert stock_levels
      await fastify.sql`
        INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available)
        VALUES (${productId}, ${warehouseId}, ${newBalance}, 0, ${newBalance})
        ON CONFLICT (product_id, warehouse_id) DO UPDATE SET
          quantity_on_hand   = stock_levels.quantity_on_hand + ${signedQty},
          quantity_available = stock_levels.quantity_available + ${signedQty}
      `;

      const rows = await fastify.sql<StockMovementRow[]>`
        SELECT * FROM stock_movements WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapMovement(rows[0]!));
    },
  );

  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/stock-movements`,
    {
      schema: {
        description: 'ประวัติการเคลื่อนไหวของสต็อก — Stock movement history with optional filters',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_MOV_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit    = parseInt(request.query['limit'] ?? '50', 10);
      const offset   = parseInt(request.query['offset'] ?? '0', 10);
      const prodId   = request.query['productId'];
      const whId     = request.query['warehouseId'];
      const dateFrom = request.query['dateFrom'];
      const dateTo   = request.query['dateTo'];

      // Build a dynamic query by composing clauses
      const conditions: string[] = [`sm.tenant_id = '${tenantId}'`];
      if (prodId)   conditions.push(`sm.product_id = '${prodId}'`);
      if (whId)     conditions.push(`sm.warehouse_id = '${whId}'`);
      if (dateFrom) conditions.push(`sm.created_at >= '${dateFrom}'`);
      if (dateTo)   conditions.push(`sm.created_at <= '${dateTo}'`);
      const where = conditions.join(' AND ');

      const countRows = await fastify.sql<CountRow[]>`
        SELECT COUNT(*)::text as count FROM stock_movements sm WHERE ${fastify.sql.unsafe(where)}
      `;
      const rows = await fastify.sql<StockMovementRow[]>`
        SELECT sm.* FROM stock_movements sm WHERE ${fastify.sql.unsafe(where)}
        ORDER BY sm.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({
        items: rows.map(mapMovement), total, limit, offset, hasMore: offset + limit < total,
      });
    },
  );

  // =========================================================================
  // STOCK LEVELS
  // =========================================================================

  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/stock-levels`,
    {
      schema: {
        description: 'ระดับสต็อกปัจจุบันของทุกสินค้าในทุกคลัง — Current stock levels for all products across all warehouses',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_LEVEL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Array<StockLevelRow & { sku: string; name_en: string; warehouse_name: string }>>`
        SELECT sl.*, p.sku, p.name_en, w.name as warehouse_name
        FROM stock_levels sl
        JOIN products p ON p.id = sl.product_id
        JOIN warehouses w ON w.id = sl.warehouse_id
        WHERE p.tenant_id = ${tenantId}
        ORDER BY p.name_en, w.name
      `;
      return reply.status(200).send({ items: rows });
    },
  );

  fastify.get<{ Params: { productId: string } }>(
    `${API_V1_PREFIX}/stock-levels/:productId`,
    {
      schema: {
        description: 'ระดับสต็อกของสินค้าเดียวในทุกคลัง — Stock levels for a single product across all warehouses',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_LEVEL_READ)],
    },
    async (request, reply) => {
      const { productId } = request.params;
      const { tenantId } = request.user;

      const product = await fastify.sql<ProductRow[]>`
        SELECT * FROM products WHERE id = ${productId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!product[0]) throw new NotFoundError({ detail: `Product ${productId} not found.` });

      const rows = await fastify.sql<Array<StockLevelRow & { warehouse_name: string }>>`
        SELECT sl.*, w.name as warehouse_name
        FROM stock_levels sl
        JOIN warehouses w ON w.id = sl.warehouse_id
        WHERE sl.product_id = ${productId}
        ORDER BY w.name
      `;
      return reply.status(200).send({ product: mapProduct(product[0]), levels: rows });
    },
  );

  // =========================================================================
  // VALUATION
  // =========================================================================

  fastify.get(
    `${API_V1_PREFIX}/inventory/valuation`,
    {
      schema: {
        description: 'รายงานมูลค่าสต็อกตามต้นทุน — Stock valuation report based on cost price',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_VAL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<{
        product_id: string; sku: string; name_en: string; unit: string;
        quantity_on_hand: number; cost_price_satang: number; total_value_satang: number;
      }[]>`
        SELECT
          p.id as product_id, p.sku, p.name_en, p.unit,
          COALESCE(SUM(sl.quantity_on_hand), 0)::integer as quantity_on_hand,
          p.cost_price_satang,
          (COALESCE(SUM(sl.quantity_on_hand), 0) * p.cost_price_satang)::integer as total_value_satang
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        WHERE p.tenant_id = ${tenantId} AND p.is_active = TRUE
        GROUP BY p.id, p.sku, p.name_en, p.unit, p.cost_price_satang
        ORDER BY p.name_en
      `;

      const grandTotalSatang = rows.reduce((sum, r) => sum + Number(r.total_value_satang), 0);
      return reply.status(200).send({ items: rows, grandTotalSatang });
    },
  );

  // =========================================================================
  // LOW STOCK
  // =========================================================================

  fastify.get(
    `${API_V1_PREFIX}/inventory/low-stock`,
    {
      schema: {
        description: 'รายการสินค้าที่สต็อกต่ำกว่าระดับขั้นต่ำ — Products with stock below minimum level',
        tags: ['inventory'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(INV_LEVEL_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<{
        product_id: string; sku: string; name_en: string; unit: string;
        min_stock_level: number; quantity_on_hand: number; shortage: number;
      }[]>`
        SELECT
          p.id as product_id, p.sku, p.name_en, p.unit, p.min_stock_level,
          COALESCE(SUM(sl.quantity_on_hand), 0)::integer as quantity_on_hand,
          (p.min_stock_level - COALESCE(SUM(sl.quantity_on_hand), 0))::integer as shortage
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        WHERE p.tenant_id = ${tenantId} AND p.is_active = TRUE
        GROUP BY p.id, p.sku, p.name_en, p.unit, p.min_stock_level
        HAVING COALESCE(SUM(sl.quantity_on_hand), 0) < p.min_stock_level
        ORDER BY shortage DESC
      `;
      return reply.status(200).send({ items: rows, count: rows.length });
    },
  );
}
