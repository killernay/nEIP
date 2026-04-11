/**
 * Credit Management routes:
 *   GET /api/v1/contacts/:id/credit-exposure — get credit exposure
 *   POST /api/v1/credit/check               — check credit for new SO
 *
 * Phase 3.6 — Credit Management
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { CRM_CONTACT_READ, AR_SO_CREATE } from '../../lib/permissions.js';

interface ContactCreditRow {
  id: string; company_name: string;
  credit_limit_satang: number | null;
}

export async function creditRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // GET /contacts/:id/credit-exposure
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/contacts/:id/credit-exposure`,
    {
      schema: {
        description: 'Get credit exposure — sum open invoices + open SOs vs credit limit',
        tags: ['credit'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(CRM_CONTACT_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      // Get contact with credit limit
      const contacts = await fastify.sql<ContactCreditRow[]>`
        SELECT id, company_name, credit_limit_satang FROM contacts
        WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!contacts[0]) throw new NotFoundError({ detail: `Contact ${id} not found.` });

      const creditLimit = BigInt(contacts[0].credit_limit_satang ?? 0);

      // Sum open invoices (posted/sent/partial/overdue) outstanding
      const invoiceExposure = await fastify.sql<[{ total: string }]>`
        SELECT COALESCE(SUM(total_satang - paid_satang), 0)::text as total
        FROM invoices
        WHERE customer_id = ${id} AND tenant_id = ${tenantId}
          AND status IN ('posted', 'sent', 'partial', 'overdue')
      `;
      const openInvoices = BigInt(invoiceExposure[0]?.total ?? '0');

      // Sum open SOs (draft/confirmed) total
      const soExposure = await fastify.sql<[{ total: string }]>`
        SELECT COALESCE(SUM(total_satang), 0)::text as total
        FROM sales_orders
        WHERE customer_id = ${id} AND tenant_id = ${tenantId}
          AND status IN ('draft', 'confirmed')
      `;
      const openSOs = BigInt(soExposure[0]?.total ?? '0');

      const totalExposure = openInvoices + openSOs;
      const available = creditLimit > 0n ? creditLimit - totalExposure : 0n;
      const exceeded = creditLimit > 0n && totalExposure > creditLimit;

      // Get tenant credit check mode
      const tenantRow = await fastify.sql<[{ credit_check_mode: string }?]>`
        SELECT credit_check_mode FROM tenants WHERE id = ${tenantId} LIMIT 1
      `;
      const mode = tenantRow[0]?.credit_check_mode ?? 'warn_only';

      return reply.send({
        contactId: id,
        companyName: contacts[0].company_name,
        creditLimitSatang: creditLimit.toString(),
        openInvoicesSatang: openInvoices.toString(),
        openSOsSatang: openSOs.toString(),
        totalExposureSatang: totalExposure.toString(),
        availableCreditSatang: (available > 0n ? available : 0n).toString(),
        exceeded,
        creditCheckMode: mode,
      });
    },
  );

  // POST /credit/check — check credit before creating SO
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/credit/check`,
    {
      schema: {
        description: 'Check credit before creating SO — returns warn/block/ok',
        tags: ['credit'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(AR_SO_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const customerId = b['customerId'] as string;
      const orderTotalSatang = BigInt((b['orderTotalSatang'] as string) ?? '0');

      if (!customerId) {
        return reply.status(400).send({ error: 'customerId is required.' });
      }

      // Get contact
      const contacts = await fastify.sql<ContactCreditRow[]>`
        SELECT id, company_name, credit_limit_satang FROM contacts
        WHERE id = ${customerId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!contacts[0]) throw new NotFoundError({ detail: `Contact ${customerId} not found.` });

      const creditLimit = BigInt(contacts[0].credit_limit_satang ?? 0);

      // No credit limit set = always ok
      if (creditLimit === 0n) {
        return reply.send({ result: 'ok', reason: 'No credit limit set.' });
      }

      // Calculate exposure
      const invoiceExposure = await fastify.sql<[{ total: string }]>`
        SELECT COALESCE(SUM(total_satang - paid_satang), 0)::text as total
        FROM invoices
        WHERE customer_id = ${customerId} AND tenant_id = ${tenantId}
          AND status IN ('posted', 'sent', 'partial', 'overdue')
      `;
      const soExposure = await fastify.sql<[{ total: string }]>`
        SELECT COALESCE(SUM(total_satang), 0)::text as total
        FROM sales_orders
        WHERE customer_id = ${customerId} AND tenant_id = ${tenantId}
          AND status IN ('draft', 'confirmed')
      `;

      const currentExposure = BigInt(invoiceExposure[0]?.total ?? '0') + BigInt(soExposure[0]?.total ?? '0');
      const projectedExposure = currentExposure + orderTotalSatang;

      if (projectedExposure <= creditLimit) {
        return reply.send({
          result: 'ok',
          currentExposureSatang: currentExposure.toString(),
          projectedExposureSatang: projectedExposure.toString(),
          creditLimitSatang: creditLimit.toString(),
        });
      }

      // Check tenant mode
      const tenantRow = await fastify.sql<[{ credit_check_mode: string }?]>`
        SELECT credit_check_mode FROM tenants WHERE id = ${tenantId} LIMIT 1
      `;
      const mode = tenantRow[0]?.credit_check_mode ?? 'warn_only';

      return reply.send({
        result: mode === 'hard_block' ? 'blocked' : 'warning',
        reason: `Credit limit exceeded. Limit: ${creditLimit}, Projected: ${projectedExposure}`,
        currentExposureSatang: currentExposure.toString(),
        projectedExposureSatang: projectedExposure.toString(),
        creditLimitSatang: creditLimit.toString(),
        creditCheckMode: mode,
      });
    },
  );
}
