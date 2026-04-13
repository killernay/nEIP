/**
 * Quality Management routes — Inspections, Compliance Certificates, BOI Promotions.
 *
 * Routes:
 *   POST /api/v1/inspections                    — create inspection
 *   GET  /api/v1/inspections                    — list inspections
 *   GET  /api/v1/inspections/:id                — get inspection detail
 *   POST /api/v1/inspections/:id/record-results — record inspection results
 *   POST /api/v1/inspections/:id/pass           — mark inspection passed
 *   POST /api/v1/inspections/:id/fail           — mark inspection failed
 *   POST /api/v1/compliance-certificates        — create certificate
 *   GET  /api/v1/compliance-certificates        — list certificates
 *   PUT  /api/v1/compliance-certificates/:id    — update certificate
 *   GET  /api/v1/compliance-certificates/expiry — check expiring certificates
 *   POST /api/v1/boi-promotions                 — create BOI promotion
 *   GET  /api/v1/boi-promotions                 — list BOI promotions
 *   GET  /api/v1/boi/active                     — active BOI promotions
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import {
  QM_INSPECTION_CREATE,
  QM_INSPECTION_READ,
  QM_INSPECTION_UPDATE,
  QM_CERT_CREATE,
  QM_CERT_READ,
  QM_CERT_UPDATE,
  QM_BOI_CREATE,
  QM_BOI_READ,
} from '../../lib/permissions.js';

export async function qualityRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {

  // =========================================================================
  // INSPECTIONS
  // =========================================================================

  // POST /api/v1/inspections — create inspection
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/inspections`,
    {
      schema: {
        description: 'สร้างการตรวจสอบคุณภาพ — Create quality inspection',
        tags: ['quality'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(QM_INSPECTION_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const id = crypto.randomUUID();

      if (!b['inspectionType']) {
        throw new ValidationError({ detail: 'inspectionType is required.' });
      }

      await fastify.sql`
        INSERT INTO quality_inspections (id, inspection_type, reference_type, reference_id,
          product_id, batch_id, inspector_id, inspection_date, status, notes, tenant_id)
        VALUES (
          ${id}, ${b['inspectionType'] as string},
          ${(b['referenceType'] as string | undefined) ?? null},
          ${(b['referenceId'] as string | undefined) ?? null},
          ${(b['productId'] as string | undefined) ?? null},
          ${(b['batchId'] as string | undefined) ?? null},
          ${(b['inspectorId'] as string | undefined) ?? null},
          ${(b['inspectionDate'] as string | undefined) ?? new Date().toISOString().split('T')[0]!},
          'planned', ${(b['notes'] as string | undefined) ?? null}, ${tenantId}
        )
      `;

      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM quality_inspections WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapInspection(rows[0]!));
    },
  );

  // GET /api/v1/inspections — list inspections
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/inspections`,
    {
      schema: { description: 'List quality inspections', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_INSPECTION_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);
      const status = request.query['status'];
      const inspectionType = request.query['inspectionType'];

      let rows: Record<string, unknown>[];
      if (status && inspectionType) {
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM quality_inspections WHERE tenant_id = ${tenantId} AND status = ${status} AND inspection_type = ${inspectionType}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (status) {
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM quality_inspections WHERE tenant_id = ${tenantId} AND status = ${status}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else if (inspectionType) {
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM quality_inspections WHERE tenant_id = ${tenantId} AND inspection_type = ${inspectionType}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        rows = await fastify.sql<Record<string, unknown>[]>`
          SELECT * FROM quality_inspections WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;
      }

      return reply.status(200).send({ items: rows.map(mapInspection) });
    },
  );

  // GET /api/v1/inspections/:id — get inspection detail with results
  fastify.get<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/inspections/:id`,
    {
      schema: { description: 'Get inspection detail with results', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_INSPECTION_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM quality_inspections WHERE id = ${request.params.id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundError({ detail: `Inspection ${request.params.id} not found.` });

      const results = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM inspection_results WHERE inspection_id = ${request.params.id} AND tenant_id = ${tenantId}
      `;

      return reply.status(200).send({
        ...mapInspection(rows[0]),
        results: results.map(mapResult),
      });
    },
  );

  // POST /api/v1/inspections/:id/record-results — record inspection results
  fastify.post<{ Params: { id: string }; Body: { results: Array<Record<string, unknown>> } }>(
    `${API_V1_PREFIX}/inspections/:id/record-results`,
    {
      schema: { description: 'Record inspection results', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_INSPECTION_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const inspectionId = request.params.id;

      const insp = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM quality_inspections WHERE id = ${inspectionId} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!insp[0]) throw new NotFoundError({ detail: `Inspection ${inspectionId} not found.` });

      const results = request.body.results ?? [];
      if (!results.length) throw new ValidationError({ detail: 'At least one result is required.' });

      // Update inspection to in_progress
      await fastify.sql`
        UPDATE quality_inspections SET status = 'in_progress', updated_at = NOW()
        WHERE id = ${inspectionId} AND tenant_id = ${tenantId}
      `;

      for (const r of results) {
        const resId = crypto.randomUUID();
        await fastify.sql`
          INSERT INTO inspection_results (id, inspection_id, characteristic_name, specification,
            lower_limit, upper_limit, actual_value, result, notes, tenant_id)
          VALUES (
            ${resId}, ${inspectionId},
            ${r['characteristicName'] as string},
            ${(r['specification'] as string | undefined) ?? null},
            ${r['lowerLimit'] != null ? Number(r['lowerLimit']) : null},
            ${r['upperLimit'] != null ? Number(r['upperLimit']) : null},
            ${r['actualValue'] != null ? Number(r['actualValue']) : null},
            ${(r['result'] as string | undefined) ?? null},
            ${(r['notes'] as string | undefined) ?? null},
            ${tenantId}
          )
        `;
      }

      const allResults = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM inspection_results WHERE inspection_id = ${inspectionId} AND tenant_id = ${tenantId}
      `;

      return reply.status(200).send({
        ...mapInspection(insp[0]),
        status: 'in_progress',
        results: allResults.map(mapResult),
      });
    },
  );

  // POST /api/v1/inspections/:id/pass — mark inspection passed
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/inspections/:id/pass`,
    {
      schema: { description: 'Mark inspection as passed', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_INSPECTION_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE quality_inspections SET status = 'passed', updated_at = NOW()
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status IN ('planned','in_progress')
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Inspection not found or already finalized.' });
      return reply.status(200).send(mapInspection(rows[0]));
    },
  );

  // POST /api/v1/inspections/:id/fail — mark inspection failed
  fastify.post<{ Params: { id: string } }>(
    `${API_V1_PREFIX}/inspections/:id/fail`,
    {
      schema: { description: 'Mark inspection as failed', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_INSPECTION_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE quality_inspections SET status = 'failed', updated_at = NOW()
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId} AND status IN ('planned','in_progress')
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Inspection not found or already finalized.' });
      return reply.status(200).send(mapInspection(rows[0]));
    },
  );

  // =========================================================================
  // COMPLIANCE CERTIFICATES
  // =========================================================================

  // POST /api/v1/compliance-certificates — create certificate
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/compliance-certificates`,
    {
      schema: {
        description: 'สร้างใบรับรองการปฏิบัติตาม — Create compliance certificate',
        tags: ['quality'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(QM_CERT_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const id = crypto.randomUUID();

      if (!b['certType'] || !b['certificateNumber'] || !b['issuer'] || !b['validFrom'] || !b['validTo']) {
        throw new ValidationError({ detail: 'certType, certificateNumber, issuer, validFrom, validTo are required.' });
      }

      await fastify.sql`
        INSERT INTO compliance_certificates (id, cert_type, certificate_number, issuer, valid_from, valid_to, status, notes, tenant_id)
        VALUES (
          ${id}, ${b['certType'] as string}, ${b['certificateNumber'] as string},
          ${b['issuer'] as string}, ${b['validFrom'] as string}, ${b['validTo'] as string},
          'active', ${(b['notes'] as string | undefined) ?? null}, ${tenantId}
        )
      `;

      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM compliance_certificates WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapCert(rows[0]!));
    },
  );

  // GET /api/v1/compliance-certificates — list certificates
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/compliance-certificates`,
    {
      schema: { description: 'List compliance certificates', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_CERT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = parseInt(request.query['limit'] ?? '50', 10);
      const offset = parseInt(request.query['offset'] ?? '0', 10);

      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM compliance_certificates WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
      return reply.status(200).send({ items: rows.map(mapCert) });
    },
  );

  // PUT /api/v1/compliance-certificates/:id — update certificate
  fastify.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/compliance-certificates/:id`,
    {
      schema: { description: 'Update compliance certificate', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_CERT_UPDATE)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const b = request.body;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        UPDATE compliance_certificates SET
          cert_type          = COALESCE(${(b['certType'] as string | undefined) ?? null}, cert_type),
          certificate_number = COALESCE(${(b['certificateNumber'] as string | undefined) ?? null}, certificate_number),
          issuer             = COALESCE(${(b['issuer'] as string | undefined) ?? null}, issuer),
          valid_from         = COALESCE(${(b['validFrom'] as string | undefined) ?? null}, valid_from),
          valid_to           = COALESCE(${(b['validTo'] as string | undefined) ?? null}, valid_to),
          status             = COALESCE(${(b['status'] as string | undefined) ?? null}, status),
          notes              = COALESCE(${(b['notes'] as string | undefined) ?? null}, notes)
        WHERE id = ${request.params.id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundError({ detail: 'Certificate not found.' });
      return reply.status(200).send(mapCert(rows[0]));
    },
  );

  // GET /api/v1/compliance-certificates/expiry — check expiring certificates
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/compliance-certificates/expiry`,
    {
      schema: { description: 'Check certificates expiring within N days', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_CERT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const days = parseInt(request.query['days'] ?? '30', 10);

      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM compliance_certificates
        WHERE tenant_id = ${tenantId}
          AND status = 'active'
          AND valid_to <= CURRENT_DATE + ${days}::integer
        ORDER BY valid_to ASC
      `;

      return reply.status(200).send({
        items: rows.map(mapCert),
        warningDays: days,
        count: rows.length,
      });
    },
  );

  // =========================================================================
  // BOI PROMOTIONS
  // =========================================================================

  // POST /api/v1/boi-promotions — create BOI promotion
  fastify.post<{ Body: Record<string, unknown> }>(
    `${API_V1_PREFIX}/boi-promotions`,
    {
      schema: {
        description: 'สร้างสิทธิประโยชน์ BOI — Create BOI promotion',
        tags: ['quality'],
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth, requirePermission(QM_BOI_CREATE)],
    },
    async (request, reply) => {
      const b = request.body;
      const { tenantId } = request.user;
      const id = crypto.randomUUID();

      if (!b['certificateNumber'] || !b['promotionType'] || !b['validFrom'] || !b['validTo']) {
        throw new ValidationError({ detail: 'certificateNumber, promotionType, validFrom, validTo are required.' });
      }

      await fastify.sql`
        INSERT INTO boi_promotions (id, certificate_number, promotion_type,
          corporate_tax_exempt_years, corporate_tax_reduction_years,
          import_duty_exempt, machine_import_exempt, conditions,
          valid_from, valid_to, status, tenant_id)
        VALUES (
          ${id}, ${b['certificateNumber'] as string}, ${b['promotionType'] as string},
          ${Number(b['corporateTaxExemptYears'] ?? 0)},
          ${Number(b['corporateTaxReductionYears'] ?? 0)},
          ${Boolean(b['importDutyExempt'] ?? false)},
          ${Boolean(b['machineImportExempt'] ?? false)},
          ${(b['conditions'] as string | undefined) ?? null},
          ${b['validFrom'] as string}, ${b['validTo'] as string},
          'active', ${tenantId}
        )
      `;

      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM boi_promotions WHERE id = ${id} LIMIT 1
      `;
      return reply.status(201).send(mapBoi(rows[0]!));
    },
  );

  // GET /api/v1/boi-promotions — list BOI promotions
  fastify.get<{ Querystring: Record<string, string> }>(
    `${API_V1_PREFIX}/boi-promotions`,
    {
      schema: { description: 'List BOI promotions', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_BOI_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM boi_promotions WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
      `;
      return reply.status(200).send({ items: rows.map(mapBoi) });
    },
  );

  // GET /api/v1/boi/active — active BOI promotions
  fastify.get(
    `${API_V1_PREFIX}/boi/active`,
    {
      schema: { description: 'Active BOI promotions (valid and active)', tags: ['quality'], security: [{ bearerAuth: [] }] },
      preHandler: [requireAuth, requirePermission(QM_BOI_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const rows = await fastify.sql<Record<string, unknown>[]>`
        SELECT * FROM boi_promotions
        WHERE tenant_id = ${tenantId}
          AND status = 'active'
          AND valid_from <= CURRENT_DATE
          AND valid_to >= CURRENT_DATE
        ORDER BY valid_to ASC
      `;
      return reply.status(200).send({ items: rows.map(mapBoi) });
    },
  );
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapInspection(r: Record<string, unknown>) {
  return {
    id: r['id'],
    inspectionType: r['inspection_type'],
    referenceType: r['reference_type'],
    referenceId: r['reference_id'],
    productId: r['product_id'],
    batchId: r['batch_id'],
    inspectorId: r['inspector_id'],
    inspectionDate: r['inspection_date'],
    status: r['status'],
    notes: r['notes'],
    createdAt: r['created_at'],
    updatedAt: r['updated_at'],
  };
}

function mapResult(r: Record<string, unknown>) {
  return {
    id: r['id'],
    inspectionId: r['inspection_id'],
    characteristicName: r['characteristic_name'],
    specification: r['specification'],
    lowerLimit: r['lower_limit'],
    upperLimit: r['upper_limit'],
    actualValue: r['actual_value'],
    result: r['result'],
    notes: r['notes'],
  };
}

function mapCert(r: Record<string, unknown>) {
  return {
    id: r['id'],
    certType: r['cert_type'],
    certificateNumber: r['certificate_number'],
    issuer: r['issuer'],
    validFrom: r['valid_from'],
    validTo: r['valid_to'],
    status: r['status'],
    notes: r['notes'],
    createdAt: r['created_at'],
  };
}

function mapBoi(r: Record<string, unknown>) {
  return {
    id: r['id'],
    certificateNumber: r['certificate_number'],
    promotionType: r['promotion_type'],
    corporateTaxExemptYears: r['corporate_tax_exempt_years'],
    corporateTaxReductionYears: r['corporate_tax_reduction_years'],
    importDutyExempt: r['import_duty_exempt'],
    machineImportExempt: r['machine_import_exempt'],
    conditions: r['conditions'],
    validFrom: r['valid_from'],
    validTo: r['valid_to'],
    status: r['status'],
    createdAt: r['created_at'],
  };
}
