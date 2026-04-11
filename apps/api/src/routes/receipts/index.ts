/**
 * Receipt routes (ใบเสร็จรับเงิน):
 *   POST /api/v1/receipts          — issue receipt
 *   GET  /api/v1/receipts          — list
 *   GET  /api/v1/receipts/:id      — detail
 *   POST /api/v1/receipts/:id/void — void receipt
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ConflictError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { toISO } from '../../lib/to-iso.js';
import {
  AR_RECEIPT_CREATE,
  AR_RECEIPT_READ,
  AR_RECEIPT_VOID,
} from '../../lib/permissions.js';
import { nextDocNumber } from '@neip/core';

// ---------------------------------------------------------------------------
// JSON Schemas
// ---------------------------------------------------------------------------

const createReceiptBodySchema = {
  type: 'object',
  required: ['customerId', 'customerName', 'amountSatang', 'receiptDate', 'paymentMethod'],
  additionalProperties: false,
  properties: {
    paymentId: { type: 'string', description: 'Optional AR payment ID' },
    invoiceId: { type: 'string', description: 'Optional invoice ID' },
    customerId: { type: 'string' },
    customerName: { type: 'string', minLength: 1, maxLength: 255 },
    amountSatang: { type: 'string', description: 'Amount in satang' },
    receiptDate: { type: 'string', format: 'date' },
    paymentMethod: { type: 'string', enum: ['cash', 'bank_transfer', 'cheque', 'promptpay', 'credit_card'] },
    reference: { type: 'string', maxLength: 255 },
    notes: { type: 'string', maxLength: 2000 },
  },
} as const;

const receiptResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    documentNumber: { type: 'string' },
    paymentId: { type: 'string', nullable: true },
    invoiceId: { type: 'string', nullable: true },
    customerId: { type: 'string' },
    customerName: { type: 'string' },
    amountSatang: { type: 'string' },
    receiptDate: { type: 'string', format: 'date' },
    paymentMethod: { type: 'string' },
    reference: { type: 'string', nullable: true },
    notes: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['issued', 'voided'] },
    voidedAt: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const listQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    status: { type: 'string', enum: ['issued', 'voided'] },
    customerId: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateReceiptBody {
  paymentId?: string;
  invoiceId?: string;
  customerId: string;
  customerName: string;
  amountSatang: string;
  receiptDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

interface ReceiptListQuery {
  limit?: number;
  offset?: number;
  status?: string;
  customerId?: string;
}

interface IdParams {
  id: string;
}

interface ReceiptRow {
  id: string;
  document_number: string;
  payment_id: string | null;
  invoice_id: string | null;
  customer_id: string;
  customer_name: string;
  amount_satang: bigint;
  receipt_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  status: string;
  voided_at: Date | string | null;
  tenant_id: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow {
  count: string;
}

function mapReceipt(r: ReceiptRow) {
  return {
    id: r.id,
    documentNumber: r.document_number,
    paymentId: r.payment_id,
    invoiceId: r.invoice_id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    amountSatang: r.amount_satang.toString(),
    receiptDate: r.receipt_date,
    paymentMethod: r.payment_method,
    reference: r.reference,
    notes: r.notes,
    status: r.status,
    voidedAt: r.voided_at ? toISO(r.voided_at) : null,
    createdAt: toISO(r.created_at),
    updatedAt: toISO(r.updated_at),
  };
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function receiptRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /api/v1/receipts — issue receipt
  // -------------------------------------------------------------------------
  fastify.post<{ Body: CreateReceiptBody }>(
    `${API_V1_PREFIX}/receipts`,
    {
      schema: {
        description: 'Issue an official receipt (ใบเสร็จรับเงิน)',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        body: createReceiptBodySchema,
        response: { 201: { description: 'Receipt issued', ...receiptResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_RECEIPT_CREATE)],
    },
    async (request, reply) => {
      const { paymentId, invoiceId, customerId, customerName, amountSatang, receiptDate, paymentMethod, reference, notes } = request.body;
      const { tenantId, sub: userId } = request.user;

      const receiptId = crypto.randomUUID();
      const documentNumber = await nextDocNumber(fastify.sql, tenantId, 'receipt', new Date().getFullYear());

      await fastify.sql`
        INSERT INTO receipts (id, document_number, payment_id, invoice_id, customer_id, customer_name,
                              amount_satang, receipt_date, payment_method, reference, notes, status, tenant_id, created_by)
        VALUES (${receiptId}, ${documentNumber}, ${paymentId ?? null}, ${invoiceId ?? null},
                ${customerId}, ${customerName}, ${amountSatang}::bigint, ${receiptDate},
                ${paymentMethod}, ${reference ?? null}, ${notes ?? null}, 'issued', ${tenantId}, ${userId})
      `;

      request.log.info({ receiptId, documentNumber, customerId, tenantId }, 'Receipt issued');

      return reply.status(201).send({
        id: receiptId,
        documentNumber,
        paymentId: paymentId ?? null,
        invoiceId: invoiceId ?? null,
        customerId,
        customerName,
        amountSatang,
        receiptDate,
        paymentMethod,
        reference: reference ?? null,
        notes: notes ?? null,
        status: 'issued',
        voidedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/receipts — list
  // -------------------------------------------------------------------------
  fastify.get<{ Querystring: ReceiptListQuery }>(
    `${API_V1_PREFIX}/receipts`,
    {
      schema: {
        description: 'List receipts',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        querystring: listQuerySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array', items: receiptResponseSchema },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_RECEIPT_READ)],
    },
    async (request, reply) => {
      const { tenantId } = request.user;
      const limit = request.query.limit ?? 20;
      const offset = request.query.offset ?? 0;
      const { status, customerId } = request.query;

      let countRows: CountRow[];
      let rows: ReceiptRow[];

      if (status !== undefined && customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM receipts WHERE tenant_id = ${tenantId} AND status = ${status} AND customer_id = ${customerId}`;
        rows = await fastify.sql<ReceiptRow[]>`SELECT * FROM receipts WHERE tenant_id = ${tenantId} AND status = ${status} AND customer_id = ${customerId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (status !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM receipts WHERE tenant_id = ${tenantId} AND status = ${status}`;
        rows = await fastify.sql<ReceiptRow[]>`SELECT * FROM receipts WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else if (customerId !== undefined) {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM receipts WHERE tenant_id = ${tenantId} AND customer_id = ${customerId}`;
        rows = await fastify.sql<ReceiptRow[]>`SELECT * FROM receipts WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      } else {
        countRows = await fastify.sql<CountRow[]>`SELECT COUNT(*)::text as count FROM receipts WHERE tenant_id = ${tenantId}`;
        rows = await fastify.sql<ReceiptRow[]>`SELECT * FROM receipts WHERE tenant_id = ${tenantId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      }

      const total = parseInt(countRows[0]?.count ?? '0', 10);
      return reply.status(200).send({ items: rows.map(mapReceipt), total, limit, offset, hasMore: offset + limit < total });
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/receipts/:id — detail
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/receipts/:id`,
    {
      schema: {
        description: 'Get receipt details',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...receiptResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_RECEIPT_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[ReceiptRow?]>`
        SELECT * FROM receipts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const receipt = rows[0];
      if (!receipt) throw new NotFoundError({ detail: `Receipt ${id} not found.` });
      return reply.status(200).send(mapReceipt(receipt));
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/v1/receipts/:id/pdf — HTML receipt export (Thai format, printable)
  // -------------------------------------------------------------------------
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/receipts/:id/pdf`,
    {
      schema: {
        description: 'Generate a printable HTML receipt (Thai format). Returns text/html for browser printing.',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      preHandler: [requireAuth, requirePermission(AR_RECEIPT_READ)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[ReceiptRow?]>`
        SELECT * FROM receipts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      const receipt = rows[0];
      if (!receipt) throw new NotFoundError({ detail: `Receipt ${id} not found.` });

      // Look up company (tenant) name
      const tenantRows = await fastify.sql<[{ name: string }?]>`
        SELECT name FROM tenants WHERE id = ${tenantId} LIMIT 1
      `;
      const companyName = tenantRows[0]?.name ?? 'บริษัท nEIP จำกัด';
      const companyTaxId = '-';

      // Format date as Thai Buddhist Era
      const receiptDateParts = String(receipt.receipt_date).split('-');
      const thaiYear = receiptDateParts[0] ? (parseInt(receiptDateParts[0], 10) + 543).toString() : '';
      const thaiMonths = [
        'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
        'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
      ];
      const monthIdx = receiptDateParts[1] ? (parseInt(receiptDateParts[1], 10) - 1) : 0;
      const thaiDate = `${receiptDateParts[2] ?? ''} ${thaiMonths[monthIdx] ?? ''} ${thaiYear}`;

      // Format amount
      const amountBaht = (Number(receipt.amount_satang) / 100).toFixed(2);
      const amountFormatted = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(Number(amountBaht));

      const paymentMethodMap: Record<string, string> = {
        cash: 'เงินสด',
        bank_transfer: 'โอนเงินผ่านธนาคาร',
        cheque: 'เช็ค',
        promptpay: 'พร้อมเพย์',
        credit_card: 'บัตรเครดิต',
      };
      const paymentMethodTh = paymentMethodMap[receipt.payment_method] ?? receipt.payment_method;

      const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ใบเสร็จรับเงิน ${receipt.document_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun', 'Tahoma', sans-serif; font-size: 14px; color: #333; background: #fff; padding: 20px; }
    .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #333; padding: 30px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
    .company-name { font-size: 22px; font-weight: 700; color: #1a1a2e; }
    .doc-title { font-size: 18px; font-weight: 600; color: #16213e; margin-top: 8px; }
    .doc-number { font-size: 13px; color: #666; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .info-item label { font-weight: 600; color: #555; display: block; font-size: 12px; }
    .info-item span { font-size: 14px; }
    .amount-box { background: #f0f8ff; border: 1px solid #4a90e2; border-radius: 6px; padding: 15px; text-align: center; margin: 20px 0; }
    .amount-label { font-size: 13px; color: #555; margin-bottom: 5px; }
    .amount-value { font-size: 28px; font-weight: 700; color: #1a1a2e; }
    .amount-unit { font-size: 14px; color: #555; }
    .footer { border-top: 1px solid #ccc; padding-top: 15px; margin-top: 20px; font-size: 12px; color: #888; text-align: center; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-issued { background: #d4edda; color: #155724; }
    .status-voided { background: #f8d7da; color: #721c24; }
    .reference { font-size: 12px; color: #777; margin-top: 5px; }
    @media print {
      body { padding: 0; }
      .receipt { border: 2px solid #000; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="company-name">${companyName}</div>
      <div style="font-size:12px; color:#777; margin-top:4px;">เลขประจำตัวผู้เสียภาษี: ${companyTaxId}</div>
      <div class="doc-title">ใบเสร็จรับเงิน / OFFICIAL RECEIPT</div>
      <div class="doc-number">เลขที่: ${receipt.document_number}</div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <label>ชื่อลูกค้า / Customer</label>
        <span>${receipt.customer_name}</span>
      </div>
      <div class="info-item">
        <label>วันที่ / Date</label>
        <span>${thaiDate}</span>
      </div>
      <div class="info-item">
        <label>วิธีชำระเงิน / Payment Method</label>
        <span>${paymentMethodTh}</span>
      </div>
      <div class="info-item">
        <label>สถานะ / Status</label>
        <span class="status-badge status-${receipt.status}">${receipt.status === 'issued' ? 'ออกใบเสร็จแล้ว' : 'ยกเลิกแล้ว'}</span>
      </div>
    </div>

    ${receipt.reference ? `<div class="reference">อ้างอิง / Reference: ${receipt.reference}</div>` : ''}
    ${receipt.notes ? `<div class="reference" style="margin-top:5px;">หมายเหตุ / Notes: ${receipt.notes}</div>` : ''}

    <div class="amount-box">
      <div class="amount-label">จำนวนเงินที่รับชำระ / Amount Received</div>
      <div class="amount-value">${amountFormatted} <span class="amount-unit">บาท (THB)</span></div>
    </div>

    <div class="footer">
      <p>ใบเสร็จรับเงินฉบับนี้ออกโดยระบบ nEIP โดยอัตโนมัติ</p>
      <p style="margin-top:4px;">This receipt was automatically generated by nEIP</p>
      <p style="margin-top:8px; font-size:11px;">ขอบคุณที่ใช้บริการ / Thank you for your business</p>
    </div>
  </div>
  <div class="no-print" style="text-align:center; margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 30px; font-size:16px; cursor:pointer; background:#4a90e2; color:#fff; border:none; border-radius:5px;">
      พิมพ์ / Print
    </button>
  </div>
</body>
</html>`;

      return reply
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Content-Disposition', `inline; filename="receipt-${receipt.document_number}.html"`)
        .status(200)
        .send(html);
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/receipts/:id/void — void receipt
  // -------------------------------------------------------------------------
  fastify.post<{ Params: IdParams }>(
    `${API_V1_PREFIX}/receipts/:id/void`,
    {
      schema: {
        description: 'Void a receipt',
        tags: ['ar'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: { 200: { ...receiptResponseSchema } },
      },
      preHandler: [requireAuth, requirePermission(AR_RECEIPT_VOID)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      const rows = await fastify.sql<[ReceiptRow?]>`
        UPDATE receipts
        SET status = 'voided', voided_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'issued'
        RETURNING *
      `;
      const receipt = rows[0];
      if (!receipt) {
        const existing = await fastify.sql<[{ id: string; status: string }?]>`
          SELECT id, status FROM receipts WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
        `;
        if (!existing[0]) throw new NotFoundError({ detail: `Receipt ${id} not found.` });
        throw new ConflictError({ detail: `Receipt ${id} cannot be voided — current status is "${existing[0].status}".` });
      }

      request.log.info({ receiptId: id, tenantId }, 'Receipt voided');
      return reply.status(200).send(mapReceipt(receipt));
    },
  );
}
