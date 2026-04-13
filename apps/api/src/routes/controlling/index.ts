/**
 * Controlling (CO) routes — SAP-gap Phase 2:
 *   POST /api/v1/controlling/standard-cost/calculate    — calculate standard cost from BOM
 *   GET  /api/v1/controlling/standard-cost               — list standard costs
 *   POST /api/v1/controlling/actual-cost/run             — run actual costing (material ledger)
 *   GET  /api/v1/controlling/actual-cost                 — list material ledger entries
 *   POST /api/v1/controlling/wip/calculate               — calculate WIP valuations
 *   GET  /api/v1/controlling/wip                         — list WIP valuations
 *   POST /api/v1/controlling/allocation/rules            — create allocation rule
 *   GET  /api/v1/controlling/allocation/rules            — list allocation rules
 *   PUT  /api/v1/controlling/allocation/rules/:id        — update allocation rule
 *   DELETE /api/v1/controlling/allocation/rules/:id      — delete allocation rule
 *   POST /api/v1/controlling/allocation/run              — execute allocation cycle
 *   CRUD /api/v1/controlling/internal-orders             — internal orders
 *   POST /api/v1/controlling/internal-orders/:id/settle  — settle internal order
 *   CRUD /api/v1/controlling/transfer-pricing            — transfer pricing rules
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  CO_STANDARD_COST_CALCULATE,
  CO_STANDARD_COST_READ,
  CO_ACTUAL_COST_RUN,
  CO_ACTUAL_COST_READ,
  CO_WIP_CALCULATE,
  CO_WIP_READ,
  CO_ALLOCATION_MANAGE,
  CO_ALLOCATION_RUN,
  CO_INTERNAL_ORDER_CREATE,
  CO_INTERNAL_ORDER_READ,
  CO_INTERNAL_ORDER_UPDATE,
  CO_INTERNAL_ORDER_SETTLE,
  CO_TRANSFER_PRICING_MANAGE,
  CO_TRANSFER_PRICING_READ,
} from '../../lib/permissions.js';

const PREFIX = `${API_V1_PREFIX}/controlling`;

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const standardCostCalcBody = {
  type: 'object',
  required: ['productId', 'fiscalYear'],
  additionalProperties: false,
  properties: {
    productId: { type: 'string' },
    fiscalYear: { type: 'integer', minimum: 2000 },
  },
} as const;

const actualCostRunBody = {
  type: 'object',
  required: ['period'],
  additionalProperties: false,
  properties: {
    period: { type: 'string', description: 'YYYY-MM format' },
  },
} as const;

const wipCalcBody = {
  type: 'object',
  required: ['period'],
  additionalProperties: false,
  properties: {
    period: { type: 'string', description: 'YYYY-MM format' },
  },
} as const;

const allocationRuleBody = {
  type: 'object',
  required: ['name', 'sourceCostCenterId', 'targetCostCenterIds', 'percentages'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1 },
    sourceCostCenterId: { type: 'string' },
    targetCostCenterIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
    allocationBasis: { type: 'string', enum: ['fixed_percent', 'headcount', 'area'] },
    percentages: { type: 'array', items: { type: 'number' }, minItems: 1 },
  },
} as const;

const internalOrderBody = {
  type: 'object',
  required: ['code', 'name'],
  additionalProperties: false,
  properties: {
    code: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    orderType: { type: 'string', enum: ['overhead', 'investment', 'accrual'] },
    budgetSatang: { type: 'string' },
    settlementCostCenterId: { type: 'string' },
    settlementGlAccountId: { type: 'string' },
  },
} as const;

const internalOrderUpdateBody = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['open', 'released', 'technically_complete', 'closed'] },
    budgetSatang: { type: 'string' },
    settlementCostCenterId: { type: 'string' },
    settlementGlAccountId: { type: 'string' },
  },
} as const;

const transferPricingBody = {
  type: 'object',
  required: ['fromCompanyId', 'toCompanyId', 'method'],
  additionalProperties: false,
  properties: {
    fromCompanyId: { type: 'string' },
    toCompanyId: { type: 'string' },
    productId: { type: 'string', nullable: true },
    method: { type: 'string', enum: ['cost_plus', 'market', 'negotiated'] },
    markupBp: { type: 'integer', minimum: 0 },
  },
} as const;

const listQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
} as const;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function controllingRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // =========================================================================
  // 7. Standard Cost Estimate
  // =========================================================================

  fastify.post(
    `${PREFIX}/standard-cost/calculate`,
    {
      schema: {
        description: 'Calculate standard cost from BOM explosion',
        tags: ['controlling'],
        security: [{ bearerAuth: [] }],
        body: standardCostCalcBody,
      },
      preHandler: [requireAuth, requirePermission(CO_STANDARD_COST_CALCULATE)],
    },
    async (request, reply) => {
      const { productId, fiscalYear } = request.body as { productId: string; fiscalYear: number };
      const { tenantId, sub: userId } = (request as any).user;

      // Explode BOM to sum material costs
      const bomLines = await fastify.sql`
        SELECT bl.component_product_id, bl.quantity, p.cost_price_satang
        FROM bom_lines bl
        JOIN bom_headers bh ON bh.id = bl.bom_id AND bh.tenant_id = ${tenantId}
        JOIN products p ON p.id = bl.component_product_id AND p.tenant_id = ${tenantId}
        WHERE bh.product_id = ${productId} AND bh.tenant_id = ${tenantId}
      `;

      let materialCost = 0n;
      for (const line of bomLines) {
        materialCost += BigInt(line['cost_price_satang'] ?? 0) * BigInt(Math.round(Number(line['quantity'])));
      }

      // Labor + overhead from work centers (simplified: sum hourly rates)
      const wcRows = await fastify.sql`
        SELECT COALESCE(SUM(cost_rate_satang), 0) AS labor
        FROM work_centers
        WHERE tenant_id = ${tenantId}
      `;
      const laborCost = BigInt(wcRows[0]?.['labor'] ?? 0);
      const overheadCost = laborCost * 20n / 100n; // 20% overhead default
      const totalCost = materialCost + laborCost + overheadCost;

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO standard_costs (id, product_id, fiscal_year, material_cost_satang, labor_cost_satang, overhead_cost_satang, total_standard_cost_satang, tenant_id, created_by)
        VALUES (${id}, ${productId}, ${fiscalYear}, ${materialCost.toString()}::bigint, ${laborCost.toString()}::bigint, ${overheadCost.toString()}::bigint, ${totalCost.toString()}::bigint, ${tenantId}, ${userId})
        ON CONFLICT (tenant_id, product_id, fiscal_year)
        DO UPDATE SET material_cost_satang = EXCLUDED.material_cost_satang,
                      labor_cost_satang = EXCLUDED.labor_cost_satang,
                      overhead_cost_satang = EXCLUDED.overhead_cost_satang,
                      total_standard_cost_satang = EXCLUDED.total_standard_cost_satang,
                      updated_at = now()
      `;

      return reply.status(201).send({
        id, productId, fiscalYear,
        materialCostSatang: materialCost.toString(),
        laborCostSatang: laborCost.toString(),
        overheadCostSatang: overheadCost.toString(),
        totalStandardCostSatang: totalCost.toString(),
      });
    },
  );

  fastify.get(
    `${PREFIX}/standard-cost`,
    {
      schema: { description: 'List standard costs', tags: ['controlling'], security: [{ bearerAuth: [] }], querystring: listQuery },
      preHandler: [requireAuth, requirePermission(CO_STANDARD_COST_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { limit = 50, offset = 0 } = request.query as any;
      const rows = await fastify.sql`
        SELECT * FROM standard_costs WHERE tenant_id = ${tenantId} ORDER BY fiscal_year DESC, product_id LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ data: rows });
    },
  );

  // =========================================================================
  // 8. Actual Costing / Material Ledger
  // =========================================================================

  fastify.post(
    `${PREFIX}/actual-cost/run`,
    {
      schema: { description: 'Run actual costing for period (material ledger)', tags: ['controlling'], security: [{ bearerAuth: [] }], body: actualCostRunBody },
      preHandler: [requireAuth, requirePermission(CO_ACTUAL_COST_RUN)],
    },
    async (request, reply) => {
      const { period } = request.body as { period: string };
      const { tenantId, sub: userId } = (request as any).user;

      // Aggregate actual costs from production order confirmations
      const rows = await fastify.sql`
        SELECT po.product_id,
               COALESCE(SUM(pc.quantity * COALESCE(p.unit_cost_satang, 0)), 0) AS actual_cost
        FROM production_orders po
        JOIN production_confirmations pc ON pc.production_order_id = po.id
        LEFT JOIN products p ON p.id = po.product_id AND p.tenant_id = ${tenantId}
        WHERE po.tenant_id = ${tenantId}
          AND to_char(pc.confirmed_at, 'YYYY-MM') = ${period}
        GROUP BY po.product_id
      `;

      const results = [];
      for (const row of rows) {
        const actualCost = BigInt(row['actual_cost'] ?? 0);
        const productId2 = row['product_id'] as string;
        // Get standard cost for comparison
        const sc = await fastify.sql`
          SELECT total_standard_cost_satang FROM standard_costs
          WHERE tenant_id = ${tenantId} AND product_id = ${productId2}
          ORDER BY fiscal_year DESC LIMIT 1
        `;
        const stdCost = BigInt(sc[0]?.['total_standard_cost_satang'] ?? 0);
        const variance = actualCost - stdCost;
        const id = crypto.randomUUID();

        await fastify.sql`
          INSERT INTO material_ledger_entries (id, product_id, period, actual_cost_satang, standard_cost_satang, variance_satang, tenant_id, created_by)
          VALUES (${id}, ${productId2}, ${period}, ${actualCost.toString()}::bigint, ${stdCost.toString()}::bigint, ${variance.toString()}::bigint, ${tenantId}, ${userId})
          ON CONFLICT (tenant_id, product_id, period)
          DO UPDATE SET actual_cost_satang = EXCLUDED.actual_cost_satang,
                        standard_cost_satang = EXCLUDED.standard_cost_satang,
                        variance_satang = EXCLUDED.variance_satang,
                        updated_at = now()
        `;
        results.push({ productId: productId2, actualCostSatang: actualCost.toString(), standardCostSatang: stdCost.toString(), varianceSatang: variance.toString() });
      }

      return reply.status(201).send({ period, entries: results });
    },
  );

  fastify.get(
    `${PREFIX}/actual-cost`,
    {
      schema: { description: 'List material ledger entries', tags: ['controlling'], security: [{ bearerAuth: [] }], querystring: listQuery },
      preHandler: [requireAuth, requirePermission(CO_ACTUAL_COST_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { limit = 50, offset = 0 } = request.query as any;
      const rows = await fastify.sql`
        SELECT * FROM material_ledger_entries WHERE tenant_id = ${tenantId} ORDER BY period DESC LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ data: rows });
    },
  );

  // =========================================================================
  // 9. WIP Calculation
  // =========================================================================

  fastify.post(
    `${PREFIX}/wip/calculate`,
    {
      schema: { description: 'Calculate WIP for open production orders', tags: ['controlling'], security: [{ bearerAuth: [] }], body: wipCalcBody },
      preHandler: [requireAuth, requirePermission(CO_WIP_CALCULATE)],
    },
    async (request, reply) => {
      const { period } = request.body as { period: string };
      const { tenantId, sub: userId } = (request as any).user;

      // Find open production orders and value WIP
      const orders = await fastify.sql`
        SELECT po.id,
               COALESCE(SUM(poc.issued_qty * COALESCE(p.unit_cost_satang, 0)), 0) AS material_wip,
               COALESCE(SUM(pc.labor_cost_satang), 0) AS labor_wip
        FROM production_orders po
        LEFT JOIN production_order_components poc ON poc.production_order_id = po.id
        LEFT JOIN products p ON p.id = poc.product_id AND p.tenant_id = ${tenantId}
        LEFT JOIN production_confirmations pc ON pc.production_order_id = po.id
        WHERE po.tenant_id = ${tenantId}
          AND po.status IN ('released', 'in_progress')
        GROUP BY po.id
      `;

      const results = [];
      for (const order of orders) {
        const materialWip = BigInt(order['material_wip'] ?? 0);
        const laborWip = BigInt(order['labor_wip'] ?? 0);
        const orderId = order['id'] as string;
        const totalWip = materialWip + laborWip;
        const id = crypto.randomUUID();

        await fastify.sql`
          INSERT INTO wip_valuations (id, production_order_id, period, material_wip_satang, labor_wip_satang, total_wip_satang, tenant_id, created_by)
          VALUES (${id}, ${orderId}, ${period}, ${materialWip.toString()}::bigint, ${laborWip.toString()}::bigint, ${totalWip.toString()}::bigint, ${tenantId}, ${userId})
          ON CONFLICT (tenant_id, production_order_id, period)
          DO UPDATE SET material_wip_satang = EXCLUDED.material_wip_satang,
                        labor_wip_satang = EXCLUDED.labor_wip_satang,
                        total_wip_satang = EXCLUDED.total_wip_satang,
                        updated_at = now()
        `;
        results.push({ productionOrderId: orderId, materialWipSatang: materialWip.toString(), laborWipSatang: laborWip.toString(), totalWipSatang: totalWip.toString() });
      }

      return reply.status(201).send({ period, valuations: results });
    },
  );

  fastify.get(
    `${PREFIX}/wip`,
    {
      schema: { description: 'List WIP valuations', tags: ['controlling'], security: [{ bearerAuth: [] }], querystring: listQuery },
      preHandler: [requireAuth, requirePermission(CO_WIP_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { limit = 50, offset = 0 } = request.query as any;
      const rows = await fastify.sql`
        SELECT * FROM wip_valuations WHERE tenant_id = ${tenantId} ORDER BY period DESC LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ data: rows });
    },
  );

  // =========================================================================
  // 10. Cost Allocation Cycles
  // =========================================================================

  fastify.post(
    `${PREFIX}/allocation/rules`,
    {
      schema: { description: 'Create cost allocation rule', tags: ['controlling'], security: [{ bearerAuth: [] }], body: allocationRuleBody },
      preHandler: [requireAuth, requirePermission(CO_ALLOCATION_MANAGE)],
    },
    async (request, reply) => {
      const { name, sourceCostCenterId, targetCostCenterIds, allocationBasis, percentages } = request.body as any;
      const { tenantId, sub: userId } = (request as any).user;
      const id = crypto.randomUUID();

      const targetArray = `{${targetCostCenterIds.map((s: string) => `"${s}"`).join(',')}}`;
      const pctArray = `{${percentages.join(',')}}`;
      await fastify.sql`
        INSERT INTO cost_allocation_rules (id, name, source_cost_center_id, target_cost_center_ids, allocation_basis, percentages, tenant_id, created_by)
        VALUES (${id}, ${name}, ${sourceCostCenterId}, ${targetArray}::text[], ${allocationBasis ?? 'fixed_percent'}, ${pctArray}::numeric[], ${tenantId}, ${userId})
      `;

      return reply.status(201).send({ id, name, sourceCostCenterId, targetCostCenterIds, allocationBasis: allocationBasis ?? 'fixed_percent', percentages });
    },
  );

  fastify.get(
    `${PREFIX}/allocation/rules`,
    {
      schema: { description: 'List cost allocation rules', tags: ['controlling'], security: [{ bearerAuth: [] }], querystring: listQuery },
      preHandler: [requireAuth, requirePermission(CO_ALLOCATION_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { limit = 50, offset = 0 } = request.query as any;
      const rows = await fastify.sql`
        SELECT * FROM cost_allocation_rules WHERE tenant_id = ${tenantId} ORDER BY name LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ data: rows });
    },
  );

  fastify.put<{ Params: { id: string } }>(
    `${PREFIX}/allocation/rules/:id`,
    {
      schema: { description: 'Update cost allocation rule', tags: ['controlling'], security: [{ bearerAuth: [] }], body: allocationRuleBody },
      preHandler: [requireAuth, requirePermission(CO_ALLOCATION_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { id } = request.params;
      const { name, sourceCostCenterId, targetCostCenterIds, allocationBasis, percentages } = request.body as any;

      const targetArray = `{${targetCostCenterIds.map((s: string) => `"${s}"`).join(',')}}`;
      const pctArray = `{${percentages.join(',')}}`;
      const result = await fastify.sql`
        UPDATE cost_allocation_rules
        SET name = ${name}, source_cost_center_id = ${sourceCostCenterId},
            target_cost_center_ids = ${targetArray}::text[],
            allocation_basis = ${allocationBasis ?? 'fixed_percent'},
            percentages = ${pctArray}::numeric[],
            updated_at = now()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (result.length === 0) throw new NotFoundError({ detail: 'Allocation rule not found' });
      return reply.send(result[0]);
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    `${PREFIX}/allocation/rules/:id`,
    {
      schema: { description: 'Delete cost allocation rule', tags: ['controlling'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(CO_ALLOCATION_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { id } = request.params;
      await fastify.sql`DELETE FROM cost_allocation_rules WHERE id = ${id} AND tenant_id = ${tenantId}`;
      return reply.status(204).send();
    },
  );

  fastify.post(
    `${PREFIX}/allocation/run`,
    {
      schema: { description: 'Execute cost allocation cycle — creates JEs', tags: ['controlling'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(CO_ALLOCATION_RUN)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user;

      const rules = await fastify.sql`
        SELECT * FROM cost_allocation_rules WHERE tenant_id = ${tenantId} ORDER BY name
      `;

      const jesCreated: string[] = [];
      for (const rule of rules) {
        const targets = rule['target_cost_center_ids'] as string[];
        const pcts = (rule['percentages'] as string[]).map(Number);
        const sourceCcId = rule['source_cost_center_id'] as string;
        const ruleName = rule['name'] as string;

        // Get total costs on source cost center from journal entry lines
        const srcCost = await fastify.sql`
          SELECT COALESCE(SUM(jel.debit_satang - jel.credit_satang), 0) AS balance
          FROM journal_entry_lines jel
          JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.tenant_id = ${tenantId}
          WHERE jel.cost_center_id = ${sourceCcId}
        `;
        const sourceBalance = BigInt(srcCost[0]?.['balance'] ?? 0);
        if (sourceBalance === 0n) continue;

        for (let i = 0; i < targets.length; i++) {
          const allocAmount = sourceBalance * BigInt(Math.round((pcts[i] ?? 0) * 100)) / 10000n;
          if (allocAmount === 0n) continue;

          const jeId = crypto.randomUUID();
          await fastify.sql`
            INSERT INTO journal_entries (id, entry_number, entry_date, description, status, tenant_id, created_by)
            VALUES (${jeId}, ${'ALLOC-' + jeId.slice(0, 8)}, CURRENT_DATE, ${'Cost allocation: ' + ruleName}, 'posted', ${tenantId}, ${userId})
          `;
          jesCreated.push(jeId);
        }
      }

      return reply.status(201).send({ journalEntriesCreated: jesCreated.length, ids: jesCreated });
    },
  );

  // =========================================================================
  // 13. Internal Orders with Settlement
  // =========================================================================

  fastify.post(
    `${PREFIX}/internal-orders`,
    {
      schema: { description: 'Create internal order', tags: ['controlling'], security: [{ bearerAuth: [] }], body: internalOrderBody },
      preHandler: [requireAuth, requirePermission(CO_INTERNAL_ORDER_CREATE)],
    },
    async (request, reply) => {
      const { code, name, orderType, budgetSatang, settlementCostCenterId, settlementGlAccountId } = request.body as any;
      const { tenantId, sub: userId } = (request as any).user;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO internal_orders (id, code, name, order_type, budget_satang, settlement_cost_center_id, settlement_gl_account_id, tenant_id, created_by)
        VALUES (${id}, ${code}, ${name}, ${orderType ?? 'overhead'}, ${(budgetSatang ?? '0')}::bigint, ${settlementCostCenterId ?? null}, ${settlementGlAccountId ?? null}, ${tenantId}, ${userId})
      `;

      return reply.status(201).send({ id, code, name, orderType: orderType ?? 'overhead', status: 'open' });
    },
  );

  fastify.get(
    `${PREFIX}/internal-orders`,
    {
      schema: { description: 'List internal orders', tags: ['controlling'], security: [{ bearerAuth: [] }], querystring: listQuery },
      preHandler: [requireAuth, requirePermission(CO_INTERNAL_ORDER_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { limit = 50, offset = 0 } = request.query as any;
      const rows = await fastify.sql`
        SELECT * FROM internal_orders WHERE tenant_id = ${tenantId} ORDER BY code LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ data: rows });
    },
  );

  fastify.get<{ Params: { id: string } }>(
    `${PREFIX}/internal-orders/:id`,
    {
      schema: { description: 'Get internal order', tags: ['controlling'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(CO_INTERNAL_ORDER_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const rows = await fastify.sql`
        SELECT * FROM internal_orders WHERE id = ${request.params.id} AND tenant_id = ${tenantId}
      `;
      if (rows.length === 0) throw new NotFoundError({ detail: 'Internal order not found' });
      return reply.send(rows[0]);
    },
  );

  fastify.put<{ Params: { id: string } }>(
    `${PREFIX}/internal-orders/:id`,
    {
      schema: { description: 'Update internal order', tags: ['controlling'], security: [{ bearerAuth: [] }], body: internalOrderUpdateBody },
      preHandler: [requireAuth, requirePermission(CO_INTERNAL_ORDER_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { id } = request.params;
      const { name, status, budgetSatang, settlementCostCenterId, settlementGlAccountId } = request.body as any;

      const result = await fastify.sql`
        UPDATE internal_orders
        SET name = COALESCE(${name ?? null}, name),
            status = COALESCE(${status ?? null}, status),
            budget_satang = COALESCE(${budgetSatang ?? null}::bigint, budget_satang),
            settlement_cost_center_id = COALESCE(${settlementCostCenterId ?? null}, settlement_cost_center_id),
            settlement_gl_account_id = COALESCE(${settlementGlAccountId ?? null}, settlement_gl_account_id),
            updated_at = now()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (result.length === 0) throw new NotFoundError({ detail: 'Internal order not found' });
      return reply.send(result[0]);
    },
  );

  fastify.post<{ Params: { id: string } }>(
    `${PREFIX}/internal-orders/:id/settle`,
    {
      schema: { description: 'Settle internal order — move costs to target', tags: ['controlling'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(CO_INTERNAL_ORDER_SETTLE)],
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = (request as any).user;
      const { id } = request.params;

      const orders = await fastify.sql`
        SELECT * FROM internal_orders WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      if (orders.length === 0) throw new NotFoundError({ detail: 'Internal order not found' });
      const order = orders[0]!;

      if (order['status'] === 'closed') throw new ValidationError({ detail: 'Order already closed' });
      if (!order['settlement_cost_center_id'] && !order['settlement_gl_account_id']) {
        throw new ValidationError({ detail: 'No settlement target configured' });
      }

      // Create settlement JE
      const jeId = crypto.randomUUID();
      const orderCode = order['code'] as string;
      await fastify.sql`
        INSERT INTO journal_entries (id, entry_number, entry_date, description, status, tenant_id, created_by)
        VALUES (${jeId}, ${'SETTLE-' + id.slice(0, 8)}, CURRENT_DATE, ${'Settlement of internal order ' + orderCode}, 'posted', ${tenantId}, ${userId})
      `;

      await fastify.sql`
        UPDATE internal_orders SET status = 'closed', updated_at = now() WHERE id = ${id}
      `;

      return reply.status(201).send({ settled: true, journalEntryId: jeId, orderId: id });
    },
  );

  // =========================================================================
  // 14. Transfer Pricing
  // =========================================================================

  fastify.post(
    `${PREFIX}/transfer-pricing`,
    {
      schema: { description: 'Create transfer pricing rule', tags: ['controlling'], security: [{ bearerAuth: [] }], body: transferPricingBody },
      preHandler: [requireAuth, requirePermission(CO_TRANSFER_PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { fromCompanyId, toCompanyId, productId, method, markupBp } = request.body as any;
      const { tenantId, sub: userId } = (request as any).user;
      const id = crypto.randomUUID();

      await fastify.sql`
        INSERT INTO transfer_pricing_rules (id, from_company_id, to_company_id, product_id, method, markup_bp, tenant_id, created_by)
        VALUES (${id}, ${fromCompanyId}, ${toCompanyId}, ${productId ?? null}, ${method}, ${markupBp ?? 0}, ${tenantId}, ${userId})
      `;

      return reply.status(201).send({ id, fromCompanyId, toCompanyId, productId, method, markupBp: markupBp ?? 0 });
    },
  );

  fastify.get(
    `${PREFIX}/transfer-pricing`,
    {
      schema: { description: 'List transfer pricing rules', tags: ['controlling'], security: [{ bearerAuth: [] }], querystring: listQuery },
      preHandler: [requireAuth, requirePermission(CO_TRANSFER_PRICING_READ)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { limit = 50, offset = 0 } = request.query as any;
      const rows = await fastify.sql`
        SELECT * FROM transfer_pricing_rules WHERE tenant_id = ${tenantId} ORDER BY from_company_id, to_company_id LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.send({ data: rows });
    },
  );

  fastify.put<{ Params: { id: string } }>(
    `${PREFIX}/transfer-pricing/:id`,
    {
      schema: { description: 'Update transfer pricing rule', tags: ['controlling'], security: [{ bearerAuth: [] }], body: transferPricingBody },
      preHandler: [requireAuth, requirePermission(CO_TRANSFER_PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      const { id } = request.params;
      const { fromCompanyId, toCompanyId, productId, method, markupBp } = request.body as any;

      const result = await fastify.sql`
        UPDATE transfer_pricing_rules
        SET from_company_id = ${fromCompanyId}, to_company_id = ${toCompanyId},
            product_id = ${productId ?? null}, method = ${method}, markup_bp = ${markupBp ?? 0},
            updated_at = now()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (result.length === 0) throw new NotFoundError({ detail: 'Transfer pricing rule not found' });
      return reply.send(result[0]);
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    `${PREFIX}/transfer-pricing/:id`,
    {
      schema: { description: 'Delete transfer pricing rule', tags: ['controlling'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(CO_TRANSFER_PRICING_MANAGE)],
    },
    async (request, reply) => {
      const { tenantId } = (request as any).user;
      await fastify.sql`DELETE FROM transfer_pricing_rules WHERE id = ${request.params.id} AND tenant_id = ${tenantId}`;
      return reply.status(204).send();
    },
  );
}
