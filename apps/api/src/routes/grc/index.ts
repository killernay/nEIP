/**
 * GRC / SoD (Segregation of Duties) routes:
 *   POST /api/v1/grc/sod-rules              — create SoD rule
 *   GET  /api/v1/grc/sod-rules              — list SoD rules
 *   DELETE /api/v1/grc/sod-rules/:id        — delete rule
 *   POST /api/v1/grc/sod-check              — check user for SoD conflicts
 *   GET  /api/v1/grc/sod-violations         — scan all users for violations
 *   GET  /api/v1/reports/sod-analysis        — SoD analysis report
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  GRC_SOD_CREATE, GRC_SOD_READ, GRC_SOD_CHECK, REPORT_SOD_READ,
} from '../../lib/permissions.js';

export async function grcRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // POST /grc/sod-rules
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/grc/sod-rules`,
    {
      schema: { description: 'Create SoD rule', tags: ['grc'] },
      preHandler: [requireAuth, requirePermission(GRC_SOD_CREATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['ruleName']) throw new ValidationError({ detail: 'ruleName is required.' });
      if (!b['conflictingPermissionA']) throw new ValidationError({ detail: 'conflictingPermissionA is required.' });
      if (!b['conflictingPermissionB']) throw new ValidationError({ detail: 'conflictingPermissionB is required.' });

      const id = crypto.randomUUID();
      await fastify.sql`
        INSERT INTO sod_rules (id, rule_name, conflicting_permission_a, conflicting_permission_b, risk_level, tenant_id)
        VALUES (${id}, ${b['ruleName'] as string}, ${b['conflictingPermissionA'] as string},
                ${b['conflictingPermissionB'] as string}, ${(b['riskLevel'] as string) ?? 'medium'}, ${tenantId})
      `;
      const rows = await fastify.sql`SELECT * FROM sod_rules WHERE id = ${id} LIMIT 1`;
      return reply.status(201).send(rows[0]);
    },
  );

  // GET /grc/sod-rules
  fastify.get(
    `${API_V1_PREFIX}/grc/sod-rules`,
    {
      schema: { description: 'List SoD rules', tags: ['grc'] },
      preHandler: [requireAuth, requirePermission(GRC_SOD_READ)],
    },
    async (request, reply) => {
      const rows = await fastify.sql`
        SELECT * FROM sod_rules WHERE tenant_id = ${request.user.tenantId} ORDER BY risk_level, rule_name
      `;
      return reply.send(rows);
    },
  );

  // DELETE /grc/sod-rules/:id
  fastify.delete<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/grc/sod-rules/:id`,
    {
      schema: { description: 'Delete SoD rule', tags: ['grc'] },
      preHandler: [requireAuth, requirePermission(GRC_SOD_CREATE)],
    },
    async (request, reply) => {
      const res = await fastify.sql`
        DELETE FROM sod_rules WHERE id = ${request.params.id} AND tenant_id = ${request.user.tenantId} RETURNING id
      `;
      if (!res[0]) throw new NotFoundError({ detail: 'SoD rule not found.' });
      return reply.status(204).send();
    },
  );

  // POST /grc/sod-check — check a user+role for SoD conflicts
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/grc/sod-check`,
    {
      schema: { description: 'Check user for SoD conflicts', tags: ['grc'] },
      preHandler: [requireAuth, requirePermission(GRC_SOD_CHECK)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      if (!b['userId']) throw new ValidationError({ detail: 'userId is required.' });

      // Get user's current permissions
      const userPerms = await fastify.sql`
        SELECT DISTINCT p.id as permission_id
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = ${b['userId'] as string} AND ur.tenant_id = ${tenantId}
      `;
      const permSet = new Set(userPerms.map((r: Record<string, unknown>) => r['permission_id'] as string));

      // Add proposed role permissions if provided
      if (b['proposedRoleId']) {
        const rolePerms = await fastify.sql`
          SELECT permission_id FROM role_permissions WHERE role_id = ${b['proposedRoleId'] as string}
        `;
        for (const rp of rolePerms) {
          permSet.add((rp as Record<string, unknown>)['permission_id'] as string);
        }
      }

      // Check against SoD rules
      const rules = await fastify.sql`SELECT * FROM sod_rules WHERE tenant_id = ${tenantId}`;
      const violations: Array<Record<string, unknown>> = [];
      for (const rule of rules) {
        const r = rule as Record<string, unknown>;
        if (permSet.has(r['conflicting_permission_a'] as string) && permSet.has(r['conflicting_permission_b'] as string)) {
          violations.push({
            ruleId: r['id'],
            ruleName: r['rule_name'],
            permissionA: r['conflicting_permission_a'],
            permissionB: r['conflicting_permission_b'],
            riskLevel: r['risk_level'],
          });
        }
      }

      return reply.send({ userId: b['userId'], violations, hasConflicts: violations.length > 0 });
    },
  );

  // GET /grc/sod-violations — scan all users
  fastify.get(
    `${API_V1_PREFIX}/grc/sod-violations`,
    {
      schema: { description: 'Scan all users for SoD violations', tags: ['grc'] },
      preHandler: [requireAuth, requirePermission(GRC_SOD_CHECK)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      const allViolations = await fastify.sql`
        SELECT u.id as user_id, u.email, sr.rule_name, sr.risk_level,
               sr.conflicting_permission_a, sr.conflicting_permission_b
        FROM sod_rules sr
        JOIN role_permissions rp_a ON rp_a.permission_id = sr.conflicting_permission_a
        JOIN role_permissions rp_b ON rp_b.permission_id = sr.conflicting_permission_b
        JOIN user_roles ur_a ON ur_a.role_id = rp_a.role_id AND ur_a.tenant_id = ${tenantId}
        JOIN user_roles ur_b ON ur_b.role_id = rp_b.role_id AND ur_b.tenant_id = ${tenantId}
            AND ur_b.user_id = ur_a.user_id
        JOIN users u ON u.id = ur_a.user_id
        WHERE sr.tenant_id = ${tenantId}
        ORDER BY sr.risk_level, u.email
      `;
      return reply.send(allViolations);
    },
  );

  // GET /reports/sod-analysis — detailed SoD report
  fastify.get(
    `${API_V1_PREFIX}/reports/sod-analysis`,
    {
      schema: { description: 'SoD analysis report', tags: ['reports'] },
      preHandler: [requireAuth, requirePermission(REPORT_SOD_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;

      const rules = await fastify.sql`SELECT * FROM sod_rules WHERE tenant_id = ${tenantId}`;
      const violations = await fastify.sql`
        SELECT u.id as user_id, u.email, sr.id as rule_id, sr.rule_name, sr.risk_level,
               sr.conflicting_permission_a, sr.conflicting_permission_b
        FROM sod_rules sr
        JOIN role_permissions rp_a ON rp_a.permission_id = sr.conflicting_permission_a
        JOIN role_permissions rp_b ON rp_b.permission_id = sr.conflicting_permission_b
        JOIN user_roles ur_a ON ur_a.role_id = rp_a.role_id AND ur_a.tenant_id = ${tenantId}
        JOIN user_roles ur_b ON ur_b.role_id = rp_b.role_id AND ur_b.tenant_id = ${tenantId}
            AND ur_b.user_id = ur_a.user_id
        JOIN users u ON u.id = ur_a.user_id
        WHERE sr.tenant_id = ${tenantId}
      `;

      return reply.send({
        totalRules: rules.length,
        totalViolations: violations.length,
        byRiskLevel: {
          high: violations.filter((v: Record<string, unknown>) => v['risk_level'] === 'high').length,
          medium: violations.filter((v: Record<string, unknown>) => v['risk_level'] === 'medium').length,
          low: violations.filter((v: Record<string, unknown>) => v['risk_level'] === 'low').length,
        },
        violations,
      });
    },
  );
}
