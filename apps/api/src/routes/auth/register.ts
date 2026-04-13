/**
 * POST /api/v1/auth/register
 *
 * Creates a new user account. Hashes the password with argon2 and returns the
 * user profile without the password hash.
 *
 * Acceptance criteria:
 *   AC#1 — email, password (min 12 chars), name → argon2 hash → save user
 *   AC#2 — response returns user profile (without password)
 *   AC#8 — all auth events logged
 *
 * Architecture references: AR21 (argon2), NFR-S6 (min 12 chars)
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as argon2 from 'argon2';
import { ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { toISO } from '../../lib/to-iso.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const registerBodySchema = {
  type: 'object',
  required: ['email', 'password', 'name'],
  additionalProperties: false,
  properties: {
    email: {
      type: 'string',
      format: 'email',
      description: 'User email address',
    },
    password: {
      type: 'string',
      minLength: 12,
      description: 'Password — minimum 12 characters',
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      description: 'Display name',
    },
    tenantId: {
      type: 'string',
      minLength: 1,
      description: 'Tenant ID to associate the user with',
    },
  },
} as const;

const registerResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
    tenantId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

// ---------------------------------------------------------------------------
// DB row types (minimal shape returned from queries)
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

// ---------------------------------------------------------------------------
// Request body type
// ---------------------------------------------------------------------------

interface RegisterBody {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function registerRoute(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  fastify.post<{ Body: RegisterBody }>(
    `${API_V1_PREFIX}/auth/register`,
    {
      schema: {
        description: 'Register a new user account',
        tags: ['auth'],
        body: registerBodySchema,
        response: {
          201: {
            description: 'User created successfully',
            ...registerResponseSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, name, tenantId } = request.body;

      // Validate password length (belt-and-suspenders — AJV enforces minLength
      // but explicit check gives a clearer error message).
      if (password.length < 12) {
        throw new ValidationError({
          detail: 'Password must be at least 12 characters long.',
          errors: [{ field: 'password', message: 'Minimum 12 characters required.' }],
        });
      }

      // Check for existing user with this email.
      const normalizedEmail = email.toLowerCase();
      const existing = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
      `;

      if (existing.length > 0) {
        request.log.warn({ email: normalizedEmail }, 'Registration attempted with existing email');
        throw new ConflictError({
          detail: `An account with email ${email} already exists.`,
        });
      }

      // Hash password with argon2id (default variant).
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MiB
        timeCost: 3,
        parallelism: 4,
      });

      const userId = crypto.randomUUID();
      const resolvedTenantId = tenantId ?? 'default';

      // Persist the new user.
      const rows = await fastify.sql<[UserRow?]>`
        INSERT INTO users (id, email, password_hash, name, tenant_id)
        VALUES (${userId}, ${normalizedEmail}, ${passwordHash}, ${name}, ${resolvedTenantId})
        RETURNING id, email, name, tenant_id, created_at, updated_at
      `;

      const created = rows[0];
      if (!created) {
        throw new Error('Failed to create user — no row returned from insert.');
      }

      // BUG-6 FIX: Assign default role to new user so they aren't locked out.
      // Look up the "Owner" role for the tenant; fall back to any available role.
      const roleRows = await fastify.sql<[{ id: string }?]>`
        SELECT id FROM roles
        WHERE tenant_id = ${resolvedTenantId}
        ORDER BY CASE WHEN name = 'Owner' THEN 0 ELSE 1 END ASC
        LIMIT 1
      `;
      const roleId = roleRows[0]?.id;
      if (roleId) {
        await fastify.sql`
          INSERT INTO user_roles (user_id, role_id, tenant_id)
          VALUES (${created.id}, ${roleId}, ${resolvedTenantId})
          ON CONFLICT DO NOTHING
        `;
      }

      request.log.info(
        { userId: created.id, email: created.email },
        'User registered successfully',
      );

      return reply.status(201).send({
        id: created.id,
        email: created.email,
        name: created.name,
        tenantId: created.tenant_id,
        createdAt: toISO(created.created_at),
        updatedAt: toISO(created.updated_at),
      });
    },
  );
}
