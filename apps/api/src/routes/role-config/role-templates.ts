/**
 * Role Template CRUD routes — manages role templates with module/page mappings.
 *
 * Routes:
 *   GET  /api/v1/role-templates        — list all role templates
 *   GET  /api/v1/role-templates/:code   — get single template
 *   POST /api/v1/role-templates         — create custom template (admin only)
 *   PUT  /api/v1/role-templates/:code   — update template (admin only, non-system)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { API_V1_PREFIX, ForbiddenError, AppError } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

interface RoleTemplateRow {
  code: string;
  name_th: string;
  name_en: string;
  description: string | null;
  allowed_modules: string[];
  allowed_pages: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

interface CreateBody {
  code: string;
  nameTh: string;
  nameEn: string;
  description?: string;
  allowedModules: string[];
  allowedPages: string[];
}

interface UpdateBody {
  nameTh?: string;
  nameEn?: string;
  description?: string;
  allowedModules?: string[];
  allowedPages?: string[];
}

interface CodeParams {
  code: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toResponse(row: RoleTemplateRow) {
  return {
    code: row.code,
    nameTh: row.name_th,
    nameEn: row.name_en,
    description: row.description,
    allowedModules: row.allowed_modules,
    allowedPages: row.allowed_pages,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function roleTemplateRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // GET /role-templates — list all
  fastify.get(
    `${API_V1_PREFIX}/role-templates`,
    {
      preHandler: [requireAuth],
      schema: {
        description: 'List all role templates',
        tags: ['roles'],
      },
    },
    async (_request, _reply) => {
      const rows = await fastify.sql<RoleTemplateRow[]>`
        SELECT code, name_th, name_en, description, allowed_modules, allowed_pages, is_system, created_at, updated_at
        FROM role_templates
        ORDER BY is_system DESC, name_en ASC
      `;
      return rows.map(toResponse);
    },
  );

  // GET /role-templates/:code — get single
  fastify.get<{ Params: CodeParams }>(
    `${API_V1_PREFIX}/role-templates/:code`,
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Get a single role template by code',
        tags: ['roles'],
      },
    },
    async (request, _reply) => {
      const { code } = request.params;
      const rows = await fastify.sql<RoleTemplateRow[]>`
        SELECT code, name_th, name_en, description, allowed_modules, allowed_pages, is_system, created_at, updated_at
        FROM role_templates
        WHERE code = ${code}
        LIMIT 1
      `;
      if (rows.length === 0) {
        throw new AppError({
          type: 'https://problems.neip.app/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Role template '${code}' not found.`,
        });
      }
      return toResponse(rows[0]!);
    },
  );

  // POST /role-templates — create custom
  fastify.post<{ Body: CreateBody }>(
    `${API_V1_PREFIX}/role-templates`,
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Create a custom role template (admin only)',
        tags: ['roles'],
        body: {
          type: 'object',
          required: ['code', 'nameTh', 'nameEn', 'allowedModules', 'allowedPages'],
          properties: {
            code: { type: 'string', minLength: 1, maxLength: 50, pattern: '^[a-z][a-z0-9_]*$' },
            nameTh: { type: 'string', minLength: 1 },
            nameEn: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            allowedModules: { type: 'array', items: { type: 'string' } },
            allowedPages: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const { code, nameTh, nameEn, description, allowedModules, allowedPages } = request.body;

      const existing = await fastify.sql<RoleTemplateRow[]>`
        SELECT code FROM role_templates WHERE code = ${code} LIMIT 1
      `;
      if (existing.length > 0) {
        throw new AppError({
          type: 'https://problems.neip.app/conflict',
          title: 'Conflict',
          status: 409,
          detail: `Role template '${code}' already exists.`,
        });
      }

      const rows = await fastify.sql<RoleTemplateRow[]>`
        INSERT INTO role_templates (code, name_th, name_en, description, allowed_modules, allowed_pages, is_system)
        VALUES (${code}, ${nameTh}, ${nameEn}, ${description ?? null}, ${allowedModules}, ${allowedPages}, false)
        RETURNING code, name_th, name_en, description, allowed_modules, allowed_pages, is_system, created_at, updated_at
      `;

      return reply.status(201).send(toResponse(rows[0]!));
    },
  );

  // PUT /role-templates/:code — update (non-system only)
  fastify.put<{ Params: CodeParams; Body: UpdateBody }>(
    `${API_V1_PREFIX}/role-templates/:code`,
    {
      preHandler: [requireAuth],
      schema: {
        description: 'Update a role template (admin only, non-system roles)',
        tags: ['roles'],
        body: {
          type: 'object',
          properties: {
            nameTh: { type: 'string', minLength: 1 },
            nameEn: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            allowedModules: { type: 'array', items: { type: 'string' } },
            allowedPages: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request, _reply) => {
      const { code } = request.params;
      const { nameTh, nameEn, description, allowedModules, allowedPages } = request.body;

      // Check exists and not system
      const existing = await fastify.sql<RoleTemplateRow[]>`
        SELECT code, is_system FROM role_templates WHERE code = ${code} LIMIT 1
      `;
      if (existing.length === 0) {
        throw new AppError({
          type: 'https://problems.neip.app/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Role template '${code}' not found.`,
        });
      }
      if (existing[0]!.is_system) {
        throw new ForbiddenError({
          detail: 'System role templates cannot be modified.',
        });
      }

      const rows = await fastify.sql<RoleTemplateRow[]>`
        UPDATE role_templates
        SET
          name_th = COALESCE(${nameTh ?? null}, name_th),
          name_en = COALESCE(${nameEn ?? null}, name_en),
          description = COALESCE(${description ?? null}, description),
          allowed_modules = COALESCE(${allowedModules ?? null}, allowed_modules),
          allowed_pages = COALESCE(${allowedPages ?? null}, allowed_pages),
          updated_at = now()
        WHERE code = ${code}
        RETURNING code, name_th, name_en, description, allowed_modules, allowed_pages, is_system, created_at, updated_at
      `;

      return toResponse(rows[0]!);
    },
  );
}
