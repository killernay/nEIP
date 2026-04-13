/**
 * GET /api/v1/onboarding/templates
 *
 * Returns all 7 industry templates. Public route — no auth required.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX } from '@neip/shared';

interface TemplateRow {
  code: string;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  icon: string | null;
  default_modules: string[];
  default_coa_preset: string;
  default_tax_config: unknown;
  default_roles: string[];
}

export async function getTemplatesRoute(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  fastify.get(
    `${API_V1_PREFIX}/onboarding/templates`,
    {
      schema: {
        description: 'List all industry templates for onboarding wizard',
        tags: ['onboarding'],
        response: {
          200: {
            type: 'object',
            properties: {
              templates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    nameTh: { type: 'string' },
                    nameEn: { type: 'string' },
                    descriptionTh: { type: 'string' },
                    descriptionEn: { type: 'string' },
                    icon: { type: 'string' },
                    defaultModules: { type: 'array', items: { type: 'string' } },
                    defaultCoaPreset: { type: 'string' },
                    defaultTaxConfig: { type: 'object' },
                    defaultRoles: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const rows = await fastify.sql<TemplateRow[]>`
        SELECT code, name_th, name_en, description_th, description_en,
               icon, default_modules, default_coa_preset, default_tax_config, default_roles
        FROM industry_templates
        ORDER BY code
      `;

      return reply.send({
        templates: rows.map((r) => ({
          code: r.code,
          nameTh: r.name_th,
          nameEn: r.name_en,
          descriptionTh: r.description_th,
          descriptionEn: r.description_en,
          icon: r.icon,
          defaultModules: r.default_modules,
          defaultCoaPreset: r.default_coa_preset,
          defaultTaxConfig: r.default_tax_config,
          defaultRoles: r.default_roles,
        })),
      });
    },
  );
}
