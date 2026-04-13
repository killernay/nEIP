/**
 * Foreign Trade routes — Incoterms, Trade Declarations, Letters of Credit, Landed Costs.
 *
 * Routes:
 *   GET  /api/v1/incoterms                         — list incoterms reference data
 *   POST /api/v1/trade-declarations                 — create declaration
 *   GET  /api/v1/trade-declarations                 — list declarations
 *   GET  /api/v1/trade-declarations/:id             — detail
 *   PUT  /api/v1/trade-declarations/:id             — update draft
 *   DELETE /api/v1/trade-declarations/:id           — delete draft
 *   POST /api/v1/trade-declarations/:id/submit      — submit to customs
 *   POST /api/v1/trade-declarations/:id/clear        — mark cleared (+ landed cost for imports)
 *   POST /api/v1/letters-of-credit                  — create LC
 *   GET  /api/v1/letters-of-credit                  — list LCs
 *   GET  /api/v1/letters-of-credit/:id              — detail
 *   PUT  /api/v1/letters-of-credit/:id              — update draft
 *   DELETE /api/v1/letters-of-credit/:id            — delete draft
 *   POST /api/v1/letters-of-credit/:id/issue        — issue LC
 *   POST /api/v1/letters-of-credit/:id/negotiate    — negotiate LC
 *   POST /api/v1/letters-of-credit/:id/settle       — settle LC
 *   POST /api/v1/letters-of-credit/:id/cancel       — cancel LC
 *   POST /api/v1/landed-costs/calculate             — calculate landed cost
 *   GET  /api/v1/landed-costs/:poId                 — view landed costs for PO
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  FT_DECLARATION_CREATE,
  FT_DECLARATION_READ,
  FT_DECLARATION_UPDATE,
  FT_DECLARATION_DELETE,
  FT_DECLARATION_SUBMIT,
  FT_DECLARATION_CLEAR,
  FT_LC_CREATE,
  FT_LC_READ,
  FT_LC_UPDATE,
  FT_LC_DELETE,
  FT_LC_ISSUE,
  FT_LC_NEGOTIATE,
  FT_LC_SETTLE,
  FT_LC_CANCEL,
  FT_LANDED_CREATE,
  FT_LANDED_READ,
} from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// Row interfaces
// ---------------------------------------------------------------------------

interface IncotermRow {
  id: string; code: string; name: string; description: string | null;
  risk_transfer_point: string | null;
}

interface DeclarationRow {
  id: string; document_number: string; type: string; customs_date: string;
  reference_type: string | null; reference_id: string | null;
  incoterm_code: string | null; country_of_origin: string | null;
  country_of_destination: string | null; port_of_loading: string | null;
  port_of_discharge: string | null; vessel_name: string | null;
  status: string; currency_code: string; exchange_rate: string;
  total_value_satang: string | bigint; total_duty_satang: string | bigint;
  customs_broker: string | null; tenant_id: string; created_by: string;
  created_at: Date | string; updated_at: Date | string;
}

interface DeclarationLineRow {
  id: string; declaration_id: string; product_id: string | null;
  hs_code: string | null; description: string | null;
  quantity: string; unit: string; unit_value_satang: string | bigint;
  customs_duty_rate_bp: number; customs_duty_satang: string | bigint;
  excise_rate_bp: number; excise_satang: string | bigint;
  vat_satang: string | bigint; tenant_id: string;
}

interface LCRow {
  id: string; lc_number: string; type: string; issuing_bank: string;
  advising_bank: string | null; beneficiary: string; applicant: string;
  amount_satang: string | bigint; currency_code: string;
  issue_date: string; expiry_date: string; shipment_deadline: string | null;
  reference_type: string | null; reference_id: string | null;
  status: string; terms: string | null; documents_required: unknown;
  tenant_id: string; created_by: string;
  created_at: Date | string; updated_at: Date | string;
}

interface LandedCostRow {
  id: string; po_id: string; product_id: string;
  purchase_price_satang: string | bigint; freight_satang: string | bigint;
  insurance_satang: string | bigint; customs_duty_satang: string | bigint;
  excise_satang: string | bigint; handling_satang: string | bigint;
  other_satang: string | bigint; total_landed_satang: string | bigint;
  cost_per_unit_satang: string | bigint; tenant_id: string;
  created_at: Date | string; updated_at: Date | string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapDeclaration(r: DeclarationRow) {
  return {
    id: r.id,
    documentNumber: r.document_number,
    type: r.type,
    customsDate: r.customs_date,
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    incotermCode: r.incoterm_code,
    countryOfOrigin: r.country_of_origin,
    countryOfDestination: r.country_of_destination,
    portOfLoading: r.port_of_loading,
    portOfDischarge: r.port_of_discharge,
    vesselName: r.vessel_name,
    status: r.status,
    currencyCode: r.currency_code,
    exchangeRate: r.exchange_rate,
    totalValueSatang: String(r.total_value_satang),
    totalDutySatang: String(r.total_duty_satang),
    customsBroker: r.customs_broker,
    tenantId: r.tenant_id,
    createdBy: r.created_by,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

function mapLC(r: LCRow) {
  return {
    id: r.id,
    lcNumber: r.lc_number,
    type: r.type,
    issuingBank: r.issuing_bank,
    advisingBank: r.advising_bank,
    beneficiary: r.beneficiary,
    applicant: r.applicant,
    amountSatang: String(r.amount_satang),
    currencyCode: r.currency_code,
    issueDate: r.issue_date,
    expiryDate: r.expiry_date,
    shipmentDeadline: r.shipment_deadline,
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    status: r.status,
    terms: r.terms,
    documentsRequired: r.documents_required,
    tenantId: r.tenant_id,
    createdBy: r.created_by,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

function mapLandedCost(r: LandedCostRow) {
  return {
    id: r.id,
    poId: r.po_id,
    productId: r.product_id,
    purchasePriceSatang: String(r.purchase_price_satang),
    freightSatang: String(r.freight_satang),
    insuranceSatang: String(r.insurance_satang),
    customsDutySatang: String(r.customs_duty_satang),
    exciseSatang: String(r.excise_satang),
    handlingSatang: String(r.handling_satang),
    otherSatang: String(r.other_satang),
    totalLandedSatang: String(r.total_landed_satang),
    costPerUnitSatang: String(r.cost_per_unit_satang),
    tenantId: r.tenant_id,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Body interfaces
// ---------------------------------------------------------------------------

interface CreateDeclarationBody {
  documentNumber: string; type: string; customsDate?: string;
  referenceType?: string; referenceId?: string; incotermCode?: string;
  countryOfOrigin?: string; countryOfDestination?: string;
  portOfLoading?: string; portOfDischarge?: string; vesselName?: string;
  currencyCode?: string; exchangeRate?: number; customsBroker?: string;
  lines?: Array<{
    productId?: string; hsCode?: string; description?: string;
    quantity: number; unit?: string; unitValueSatang: string | number;
    customsDutyRateBp?: number; exciseRateBp?: number;
  }>;
}

interface UpdateDeclarationBody {
  documentNumber?: string; customsDate?: string; incotermCode?: string;
  countryOfOrigin?: string; countryOfDestination?: string;
  portOfLoading?: string; portOfDischarge?: string; vesselName?: string;
  customsBroker?: string; currencyCode?: string;
}

interface CreateLCBody {
  lcNumber: string; type: string; issuingBank: string;
  advisingBank?: string; beneficiary: string; applicant: string;
  amountSatang?: string | number; currencyCode?: string;
  issueDate?: string; expiryDate: string; shipmentDeadline?: string;
  referenceType?: string; referenceId?: string; terms?: string;
  documentsRequired?: unknown[];
}

interface UpdateLCBody {
  lcNumber?: string; issuingBank?: string; advisingBank?: string;
  beneficiary?: string; applicant?: string; amountSatang?: string | number;
  currencyCode?: string; expiryDate?: string; shipmentDeadline?: string;
  terms?: string;
}

interface CalculateLandedCostBody {
  poId: string; productId: string; quantity?: number;
  purchasePriceSatang?: string | number;
  freightSatang?: string | number; insuranceSatang?: string | number;
  customsDutySatang?: string | number; exciseSatang?: string | number;
  handlingSatang?: string | number; otherSatang?: string | number;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function tradeRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  const { sql } = fastify;

  // =========================================================================
  // INCOTERMS — reference data
  // =========================================================================

  fastify.get(`${API_V1_PREFIX}/incoterms`, {
    onRequest: [requireAuth],
  }, async (_request, _reply) => {
    const rows = await sql<IncotermRow[]>`SELECT * FROM incoterms ORDER BY code`;
    return {
      data: rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        riskTransferPoint: r.risk_transfer_point,
      })),
    };
  });

  // =========================================================================
  // TRADE DECLARATIONS — CRUD + submit + clear
  // =========================================================================

  // CREATE
  fastify.post(`${API_V1_PREFIX}/trade-declarations`, {
    onRequest: [requireAuth, requirePermission(FT_DECLARATION_CREATE)],
  }, async (request, reply) => {
    const body = request.body as CreateDeclarationBody;
    const tenantId = (request.user as { tenantId: string; sub: string }).tenantId;
    const userId = (request.user as { tenantId: string; sub: string }).sub;

    const id = `tdecl_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    if (!body.documentNumber || !body.type) throw new ValidationError({ detail: 'documentNumber and type are required.' });
    if (body.type !== 'import' && body.type !== 'export') throw new ValidationError({ detail: 'type must be import or export.' });

    const lines = body.lines ?? [];

    await sql`
      INSERT INTO trade_declarations (
        id, document_number, type, customs_date, reference_type, reference_id,
        incoterm_code, country_of_origin, country_of_destination,
        port_of_loading, port_of_discharge, vessel_name,
        currency_code, exchange_rate, customs_broker,
        tenant_id, created_by
      ) VALUES (
        ${id}, ${body.documentNumber}, ${body.type},
        ${body.customsDate || new Date().toISOString().slice(0, 10)},
        ${body.referenceType || null},
        ${body.referenceId || null},
        ${body.incotermCode || null},
        ${body.countryOfOrigin || null},
        ${body.countryOfDestination || null},
        ${body.portOfLoading || null},
        ${body.portOfDischarge || null},
        ${body.vesselName || null},
        ${body.currencyCode || 'THB'},
        ${body.exchangeRate ?? 1.0},
        ${body.customsBroker || null},
        ${tenantId}, ${userId}
      )
    `;

    let totalValue = 0n;
    let totalDuty = 0n;
    for (const line of lines) {
      const lineId = `tdln_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
      const qty = line.quantity || 0;
      const unitVal = BigInt(line.unitValueSatang ?? 0);
      const dutyBp = line.customsDutyRateBp ?? 0;
      const exciseBp = line.exciseRateBp ?? 0;
      const lineTotal = unitVal * BigInt(Math.round(qty * 10000)) / 10000n;
      const dutySatang = lineTotal * BigInt(dutyBp) / 10000n;
      const exciseSatang = lineTotal * BigInt(exciseBp) / 10000n;
      const vatSatang = (lineTotal + dutySatang + exciseSatang) * 700n / 10000n;

      totalValue += lineTotal;
      totalDuty += dutySatang + exciseSatang + vatSatang;

      await sql`
        INSERT INTO trade_declaration_lines (
          id, declaration_id, product_id, hs_code, description,
          quantity, unit, unit_value_satang,
          customs_duty_rate_bp, customs_duty_satang,
          excise_rate_bp, excise_satang, vat_satang, tenant_id
        ) VALUES (
          ${lineId}, ${id},
          ${line.productId || null},
          ${line.hsCode || null},
          ${line.description || null},
          ${qty}, ${line.unit || 'PCS'},
          ${unitVal.toString()},
          ${dutyBp}, ${dutySatang.toString()},
          ${exciseBp}, ${exciseSatang.toString()},
          ${vatSatang.toString()}, ${tenantId}
        )
      `;
    }

    await sql`
      UPDATE trade_declarations
      SET total_value_satang = ${totalValue.toString()},
          total_duty_satang = ${totalDuty.toString()}
      WHERE id = ${id}
    `;

    const [row] = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE id = ${id}`;
    reply.code(201);
    return { data: mapDeclaration(row!) };
  });

  // LIST
  fastify.get(`${API_V1_PREFIX}/trade-declarations`, {
    onRequest: [requireAuth, requirePermission(FT_DECLARATION_READ)],
  }, async (request, _reply) => {
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const q = request.query as { type?: string; status?: string };
    const type = q.type;
    const status = q.status;

    let rows: DeclarationRow[];
    if (type && status) {
      rows = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE tenant_id = ${tenantId} AND type = ${type} AND status = ${status} ORDER BY created_at DESC`;
    } else if (type) {
      rows = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE tenant_id = ${tenantId} AND type = ${type} ORDER BY created_at DESC`;
    } else if (status) {
      rows = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC`;
    } else {
      rows = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
    }
    return { data: rows.map(mapDeclaration) };
  });

  // DETAIL
  fastify.get(`${API_V1_PREFIX}/trade-declarations/:id`, {
    onRequest: [requireAuth, requirePermission(FT_DECLARATION_READ)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [row] = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!row) throw new NotFoundError({ detail: 'Trade declaration not found' });
    const lines = await sql<DeclarationLineRow[]>`SELECT * FROM trade_declaration_lines WHERE declaration_id = ${id} ORDER BY id`;
    return {
      data: {
        ...mapDeclaration(row),
        lines: lines.map((l) => ({
          id: l.id,
          productId: l.product_id,
          hsCode: l.hs_code,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitValueSatang: String(l.unit_value_satang),
          customsDutyRateBp: l.customs_duty_rate_bp,
          customsDutySatang: String(l.customs_duty_satang),
          exciseRateBp: l.excise_rate_bp,
          exciseSatang: String(l.excise_satang),
          vatSatang: String(l.vat_satang),
        })),
      },
    };
  });

  // UPDATE
  fastify.put(`${API_V1_PREFIX}/trade-declarations/:id`, {
    onRequest: [requireAuth, requirePermission(FT_DECLARATION_UPDATE)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Trade declaration not found' });
    if (existing.status !== 'draft') throw new ConflictError({ detail: 'Only draft declarations can be updated' });

    const body = request.body as UpdateDeclarationBody;
    await sql`
      UPDATE trade_declarations SET
        document_number = COALESCE(${body.documentNumber ?? null}, document_number),
        customs_date = COALESCE(${body.customsDate ?? null}, customs_date),
        incoterm_code = COALESCE(${body.incotermCode ?? null}, incoterm_code),
        country_of_origin = COALESCE(${body.countryOfOrigin ?? null}, country_of_origin),
        country_of_destination = COALESCE(${body.countryOfDestination ?? null}, country_of_destination),
        port_of_loading = COALESCE(${body.portOfLoading ?? null}, port_of_loading),
        port_of_discharge = COALESCE(${body.portOfDischarge ?? null}, port_of_discharge),
        vessel_name = COALESCE(${body.vesselName ?? null}, vessel_name),
        customs_broker = COALESCE(${body.customsBroker ?? null}, customs_broker),
        currency_code = COALESCE(${body.currencyCode ?? null}, currency_code),
        updated_at = now()
      WHERE id = ${id}
    `;
    const [row] = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE id = ${id}`;
    return { data: mapDeclaration(row!) };
  });

  // DELETE
  fastify.delete(`${API_V1_PREFIX}/trade-declarations/:id`, {
    onRequest: [requireAuth, requirePermission(FT_DECLARATION_DELETE)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<{ status: string }[]>`SELECT status FROM trade_declarations WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Trade declaration not found' });
    if (existing.status !== 'draft') throw new ConflictError({ detail: 'Only draft declarations can be deleted' });
    await sql`DELETE FROM trade_declarations WHERE id = ${id}`;
    reply.code(204);
  });

  // SUBMIT
  fastify.post(`${API_V1_PREFIX}/trade-declarations/:id/submit`, {
    onRequest: [requireAuth, requirePermission(FT_DECLARATION_SUBMIT)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Trade declaration not found' });
    if (existing.status !== 'draft') throw new ConflictError({ detail: 'Only draft declarations can be submitted' });

    await sql`UPDATE trade_declarations SET status = 'submitted', updated_at = now() WHERE id = ${id}`;
    const [row] = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE id = ${id}`;
    return { data: mapDeclaration(row!) };
  });

  // CLEAR (customs clearance) — for imports, auto-calculate landed cost
  fastify.post(`${API_V1_PREFIX}/trade-declarations/:id/clear`, {
    onRequest: [requireAuth, requirePermission(FT_DECLARATION_CLEAR)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Trade declaration not found' });
    if (existing.status !== 'submitted' && existing.status !== 'inspecting') {
      throw new ConflictError({ detail: 'Declaration must be submitted or inspecting to be cleared' });
    }

    await sql`UPDATE trade_declarations SET status = 'cleared', updated_at = now() WHERE id = ${id}`;

    // For import declarations linked to a PO, calculate landed costs
    if (existing.type === 'import' && existing.reference_type === 'po' && existing.reference_id) {
      const poId = existing.reference_id;
      const lines = await sql<DeclarationLineRow[]>`SELECT * FROM trade_declaration_lines WHERE declaration_id = ${id}`;

      for (const line of lines) {
        if (!line.product_id) continue;

        const lcId = `lc_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
        const purchasePrice = BigInt(line.unit_value_satang) * BigInt(Math.round(Number(line.quantity) * 10000)) / 10000n;
        const duty = BigInt(line.customs_duty_satang);
        const excise = BigInt(line.excise_satang);
        const totalLanded = purchasePrice + duty + excise;
        const qty = Number(line.quantity) || 1;
        const costPerUnit = totalLanded / BigInt(Math.max(1, Math.round(qty)));

        await sql`
          INSERT INTO landed_costs (
            id, po_id, product_id, purchase_price_satang,
            customs_duty_satang, excise_satang, total_landed_satang,
            cost_per_unit_satang, tenant_id
          ) VALUES (
            ${lcId}, ${poId}, ${line.product_id},
            ${purchasePrice.toString()}, ${duty.toString()}, ${excise.toString()},
            ${totalLanded.toString()}, ${costPerUnit.toString()}, ${tenantId}
          )
        `;

        await sql`
          UPDATE products SET cost_price_satang = ${costPerUnit.toString()}, updated_at = now()
          WHERE id = ${line.product_id} AND tenant_id = ${tenantId}
        `;
      }
    }

    const [row] = await sql<DeclarationRow[]>`SELECT * FROM trade_declarations WHERE id = ${id}`;
    return { data: mapDeclaration(row!) };
  });

  // =========================================================================
  // LETTERS OF CREDIT — CRUD + issue + negotiate + settle + cancel
  // =========================================================================

  // CREATE
  fastify.post(`${API_V1_PREFIX}/letters-of-credit`, {
    onRequest: [requireAuth, requirePermission(FT_LC_CREATE)],
  }, async (request, reply) => {
    const body = request.body as CreateLCBody;
    const tenantId = (request.user as { tenantId: string; sub: string }).tenantId;
    const userId = (request.user as { tenantId: string; sub: string }).sub;

    const id = `lc_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
    if (!body.lcNumber || !body.type) throw new ValidationError({ detail: 'lcNumber and type are required.' });
    if (!body.issuingBank || !body.beneficiary || !body.applicant) {
      throw new ValidationError({ detail: 'issuingBank, beneficiary, and applicant are required.' });
    }

    await sql`
      INSERT INTO letters_of_credit (
        id, lc_number, type, issuing_bank, advising_bank,
        beneficiary, applicant, amount_satang, currency_code,
        issue_date, expiry_date, shipment_deadline,
        reference_type, reference_id, terms, documents_required,
        tenant_id, created_by
      ) VALUES (
        ${id}, ${body.lcNumber}, ${body.type},
        ${body.issuingBank}, ${body.advisingBank || null},
        ${body.beneficiary}, ${body.applicant},
        ${String(body.amountSatang ?? 0)},
        ${body.currencyCode || 'THB'},
        ${body.issueDate || new Date().toISOString().slice(0, 10)},
        ${body.expiryDate},
        ${body.shipmentDeadline || null},
        ${body.referenceType || null},
        ${body.referenceId || null},
        ${body.terms || null},
        ${JSON.stringify(body.documentsRequired ?? [])},
        ${tenantId}, ${userId}
      )
    `;

    const [row] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id}`;
    reply.code(201);
    return { data: mapLC(row!) };
  });

  // LIST
  fastify.get(`${API_V1_PREFIX}/letters-of-credit`, {
    onRequest: [requireAuth, requirePermission(FT_LC_READ)],
  }, async (request, _reply) => {
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const q = request.query as { type?: string; status?: string };

    let rows: LCRow[];
    if (q.type && q.status) {
      rows = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE tenant_id = ${tenantId} AND type = ${q.type} AND status = ${q.status} ORDER BY created_at DESC`;
    } else if (q.type) {
      rows = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE tenant_id = ${tenantId} AND type = ${q.type} ORDER BY created_at DESC`;
    } else if (q.status) {
      rows = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE tenant_id = ${tenantId} AND status = ${q.status} ORDER BY created_at DESC`;
    } else {
      rows = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
    }
    return { data: rows.map(mapLC) };
  });

  // DETAIL
  fastify.get(`${API_V1_PREFIX}/letters-of-credit/:id`, {
    onRequest: [requireAuth, requirePermission(FT_LC_READ)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [row] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!row) throw new NotFoundError({ detail: 'Letter of credit not found' });
    return { data: mapLC(row!) };
  });

  // UPDATE
  fastify.put(`${API_V1_PREFIX}/letters-of-credit/:id`, {
    onRequest: [requireAuth, requirePermission(FT_LC_UPDATE)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Letter of credit not found' });
    if (existing.status !== 'draft') throw new ConflictError({ detail: 'Only draft LCs can be updated' });

    const body = request.body as UpdateLCBody;
    await sql`
      UPDATE letters_of_credit SET
        lc_number = COALESCE(${body.lcNumber ?? null}, lc_number),
        issuing_bank = COALESCE(${body.issuingBank ?? null}, issuing_bank),
        advising_bank = COALESCE(${body.advisingBank ?? null}, advising_bank),
        beneficiary = COALESCE(${body.beneficiary ?? null}, beneficiary),
        applicant = COALESCE(${body.applicant ?? null}, applicant),
        amount_satang = COALESCE(${body.amountSatang != null ? String(body.amountSatang) : null}, amount_satang),
        currency_code = COALESCE(${body.currencyCode ?? null}, currency_code),
        expiry_date = COALESCE(${body.expiryDate ?? null}, expiry_date),
        shipment_deadline = COALESCE(${body.shipmentDeadline ?? null}, shipment_deadline),
        terms = COALESCE(${body.terms ?? null}, terms),
        updated_at = now()
      WHERE id = ${id}
    `;
    const [row] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id}`;
    return { data: mapLC(row!) };
  });

  // DELETE
  fastify.delete(`${API_V1_PREFIX}/letters-of-credit/:id`, {
    onRequest: [requireAuth, requirePermission(FT_LC_DELETE)],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<{ status: string }[]>`SELECT status FROM letters_of_credit WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Letter of credit not found' });
    if (existing.status !== 'draft') throw new ConflictError({ detail: 'Only draft LCs can be deleted' });
    await sql`DELETE FROM letters_of_credit WHERE id = ${id}`;
    reply.code(204);
  });

  // ISSUE
  fastify.post(`${API_V1_PREFIX}/letters-of-credit/:id/issue`, {
    onRequest: [requireAuth, requirePermission(FT_LC_ISSUE)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Letter of credit not found' });
    if (existing.status !== 'draft' && existing.status !== 'applied') throw new ConflictError({ detail: 'LC must be draft or applied to be issued' });

    await sql`UPDATE letters_of_credit SET status = 'issued', updated_at = now() WHERE id = ${id}`;
    const [row] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id}`;
    return { data: mapLC(row!) };
  });

  // NEGOTIATE
  fastify.post(`${API_V1_PREFIX}/letters-of-credit/:id/negotiate`, {
    onRequest: [requireAuth, requirePermission(FT_LC_NEGOTIATE)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Letter of credit not found' });
    if (existing.status !== 'issued') throw new ConflictError({ detail: 'LC must be issued to be negotiated' });

    await sql`UPDATE letters_of_credit SET status = 'negotiated', updated_at = now() WHERE id = ${id}`;
    const [row] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id}`;
    return { data: mapLC(row!) };
  });

  // SETTLE
  fastify.post(`${API_V1_PREFIX}/letters-of-credit/:id/settle`, {
    onRequest: [requireAuth, requirePermission(FT_LC_SETTLE)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Letter of credit not found' });
    if (existing.status !== 'negotiated') throw new ConflictError({ detail: 'LC must be negotiated to be settled' });

    await sql`UPDATE letters_of_credit SET status = 'settled', updated_at = now() WHERE id = ${id}`;
    const [row] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id}`;
    return { data: mapLC(row!) };
  });

  // CANCEL
  fastify.post(`${API_V1_PREFIX}/letters-of-credit/:id/cancel`, {
    onRequest: [requireAuth, requirePermission(FT_LC_CANCEL)],
  }, async (request, _reply) => {
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const [existing] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id} AND tenant_id = ${tenantId}`;
    if (!existing) throw new NotFoundError({ detail: 'Letter of credit not found' });
    if (existing.status === 'settled' || existing.status === 'cancelled') throw new ConflictError({ detail: 'Cannot cancel a settled or already cancelled LC' });

    await sql`UPDATE letters_of_credit SET status = 'cancelled', updated_at = now() WHERE id = ${id}`;
    const [row] = await sql<LCRow[]>`SELECT * FROM letters_of_credit WHERE id = ${id}`;
    return { data: mapLC(row!) };
  });

  // =========================================================================
  // LANDED COSTS — calculate + view
  // =========================================================================

  // CALCULATE
  fastify.post(`${API_V1_PREFIX}/landed-costs/calculate`, {
    onRequest: [requireAuth, requirePermission(FT_LANDED_CREATE)],
  }, async (request, reply) => {
    const body = request.body as CalculateLandedCostBody;
    const tenantId = (request.user as { tenantId: string }).tenantId;

    if (!body.poId || !body.productId) throw new ValidationError({ detail: 'poId and productId are required.' });

    const quantity = body.quantity ?? 1;
    const purchasePrice = BigInt(body.purchasePriceSatang ?? 0);
    const freight = BigInt(body.freightSatang ?? 0);
    const insurance = BigInt(body.insuranceSatang ?? 0);
    const customsDuty = BigInt(body.customsDutySatang ?? 0);
    const excise = BigInt(body.exciseSatang ?? 0);
    const handling = BigInt(body.handlingSatang ?? 0);
    const other = BigInt(body.otherSatang ?? 0);
    const totalLanded = purchasePrice + freight + insurance + customsDuty + excise + handling + other;
    const costPerUnit = totalLanded / BigInt(Math.max(1, quantity));

    const id = `lcst_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

    await sql`
      INSERT INTO landed_costs (
        id, po_id, product_id, purchase_price_satang,
        freight_satang, insurance_satang, customs_duty_satang,
        excise_satang, handling_satang, other_satang,
        total_landed_satang, cost_per_unit_satang, tenant_id
      ) VALUES (
        ${id}, ${body.poId}, ${body.productId},
        ${purchasePrice.toString()}, ${freight.toString()},
        ${insurance.toString()}, ${customsDuty.toString()},
        ${excise.toString()}, ${handling.toString()},
        ${other.toString()}, ${totalLanded.toString()},
        ${costPerUnit.toString()}, ${tenantId}
      )
    `;

    await sql`
      UPDATE products SET cost_price_satang = ${costPerUnit.toString()}, updated_at = now()
      WHERE id = ${body.productId} AND tenant_id = ${tenantId}
    `;

    const [row] = await sql<LandedCostRow[]>`SELECT * FROM landed_costs WHERE id = ${id}`;
    reply.code(201);
    return { data: mapLandedCost(row!) };
  });

  // VIEW by PO
  fastify.get(`${API_V1_PREFIX}/landed-costs/:poId`, {
    onRequest: [requireAuth, requirePermission(FT_LANDED_READ)],
  }, async (request, _reply) => {
    const { poId } = request.params as { poId: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const rows = await sql<LandedCostRow[]>`SELECT * FROM landed_costs WHERE po_id = ${poId} AND tenant_id = ${tenantId} ORDER BY created_at DESC`;
    return { data: rows.map(mapLandedCost) };
  });
}
