/**
 * GET /api/v1/onboarding/status
 *
 * Returns current onboarding state for the authenticated user's tenant.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { toISO } from '../../lib/to-iso.js';

interface OnboardingRow {
  id: string;
  tenant_id: string;
  current_step: number;
  industry_template: string | null;
  company_name: string | null;
  company_tax_id: string | null;
  company_type: string | null;
  fiscal_year_start: number;
  base_currency: string;
  selected_modules: string[];
  enterprise_structure: unknown;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export async function getStatusRoute(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  fastify.get(
    `${API_V1_PREFIX}/onboarding/status`,
    {
      schema: {
        description: 'Get current onboarding state for the tenant',
        tags: ['onboarding'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              onboarding: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  tenantId: { type: 'string' },
                  currentStep: { type: 'integer' },
                  industryTemplate: { type: 'string', nullable: true },
                  companyName: { type: 'string', nullable: true },
                  companyTaxId: { type: 'string', nullable: true },
                  companyType: { type: 'string', nullable: true },
                  fiscalYearStart: { type: 'integer' },
                  baseCurrency: { type: 'string' },
                  selectedModules: { type: 'array', items: { type: 'string' } },
                  enterpriseStructure: { type: 'object' },
                  completedAt: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const tenantId = request.user.tenantId;

      const rows = await fastify.sql<OnboardingRow[]>`
        SELECT * FROM tenant_onboarding WHERE tenant_id = ${tenantId} LIMIT 1
      `;

      const row = rows[0];
      if (!row) {
        return reply.send({ onboarding: null });
      }

      return reply.send({
        onboarding: {
          id: row.id,
          tenantId: row.tenant_id,
          currentStep: row.current_step,
          industryTemplate: row.industry_template,
          companyName: row.company_name,
          companyTaxId: row.company_tax_id,
          companyType: row.company_type,
          fiscalYearStart: row.fiscal_year_start,
          baseCurrency: row.base_currency,
          selectedModules: row.selected_modules,
          enterpriseStructure: row.enterprise_structure,
          completedAt: row.completed_at ? toISO(row.completed_at) : null,
          createdAt: toISO(row.created_at),
          updatedAt: toISO(row.updated_at),
        },
      });
    },
  );
}
