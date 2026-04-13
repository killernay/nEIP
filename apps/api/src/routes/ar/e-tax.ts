/**
 * e-Tax Invoice XML generation (Thai Revenue Department ETDA schema):
 *   GET /api/v1/invoices/:id/e-tax-xml — generate XML for an invoice
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { NotFoundError, ValidationError, API_V1_PREFIX } from '@neip/shared';
import { requireAuth } from '../../hooks/require-auth.js';
import { requirePermission } from '../../hooks/require-permission.js';
import { AR_ETAX_GENERATE } from '../../lib/permissions.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IdParams { id: string; }

interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  status: string;
  total_satang: bigint;
  paid_satang: bigint;
  due_date: string;
  notes: string | null;
  tenant_id: string;
  created_at: Date | string;
}

interface LineRow {
  line_number: number;
  description: string;
  quantity: number;
  unit_price_satang: bigint;
  total_satang: bigint;
}

interface ContactRow {
  id: string;
  name: string;
  tax_id: string | null;
  branch_number: string | null;
  address: string | null;
  email: string | null;
}

interface TenantRow {
  id: string;
  company_name: string | null;
  tax_id: string | null;
  branch_number: string | null;
  address: string | null;
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export async function eTaxRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions,
): Promise<void> {
  // GET /api/v1/invoices/:id/e-tax-xml
  fastify.get<{ Params: IdParams }>(
    `${API_V1_PREFIX}/invoices/:id/e-tax-xml`,
    {
      schema: {
        description: 'Generate e-Tax Invoice XML per Thai Revenue Department ETDA schema',
        tags: ['ar', 'thai-compliance'],
        security: [{ bearerAuth: [] }],
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        response: {
          200: {
            description: 'e-Tax Invoice XML',
            type: 'string',
          },
        },
      },
      preHandler: [requireAuth, requirePermission(AR_ETAX_GENERATE)],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { tenantId } = request.user;

      // Fetch invoice
      const invRows = await fastify.sql<[InvoiceRow?]>`
        SELECT * FROM invoices WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1
      `;
      if (!invRows[0]) throw new NotFoundError({ detail: `Invoice ${id} not found.` });
      const inv = invRows[0];

      if (inv.status === 'draft') {
        throw new ValidationError({ detail: 'Cannot generate e-Tax XML for draft invoices.' });
      }

      // Fetch line items
      const lines = await fastify.sql<LineRow[]>`
        SELECT line_number, description, quantity, unit_price_satang, total_satang
        FROM invoice_line_items WHERE invoice_id = ${id}
        ORDER BY line_number
      `;

      // Fetch buyer (customer) info
      const buyerRows = await fastify.sql<[ContactRow?]>`
        SELECT id, name, tax_id, branch_number, address, email
        FROM contacts WHERE id = ${inv.customer_id} LIMIT 1
      `;
      const buyer = buyerRows[0];

      // Fetch seller (tenant) info
      const sellerRows = await fastify.sql<[TenantRow?]>`
        SELECT id, company_name, tax_id, branch_number, address
        FROM tenants WHERE id = ${tenantId} LIMIT 1
      `;
      const seller = sellerRows[0];

      // Calculate VAT (7% standard Thai rate)
      const subtotal = BigInt(inv.total_satang);
      const vatRate = 700; // 7.00% in basis points
      const vatAmount = (subtotal * BigInt(vatRate) + 5000n) / 10000n;
      const grandTotal = subtotal + vatAmount;

      // Format amounts from satang to baht string
      const toBaht = (satang: bigint | number) => {
        const s = BigInt(satang);
        const whole = s / 100n;
        const frac = (s % 100n).toString().padStart(2, '0');
        return `${whole}.${frac}`;
      };

      const escXml = (s: string | null | undefined) => {
        if (!s) return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      const now = new Date();
      const issueDate = now.toISOString().slice(0, 10);
      const issueTime = now.toISOString().slice(11, 19);

      // Build XML per ETDA e-Tax Invoice schema
      const lineItemsXml = lines.map((line, idx) => `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="EA">${line.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="THB">${toBaht(line.total_satang)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escXml(line.description)}</cbc:Description>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="THB">${toBaht(line.unit_price_satang)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`).join('');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:etda:th:standard:e-tax-invoice:2.0</cbc:CustomizationID>
  <cbc:ID>${escXml(inv.invoice_number)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>THB</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escXml(seller?.company_name)}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escXml(seller?.tax_id)}</cbc:CompanyID>
        <cbc:TaxLevelCode>${escXml(seller?.branch_number ?? '00000')}</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(seller?.address)}</cbc:StreetName>
        <cac:Country>
          <cbc:IdentificationCode>TH</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escXml(buyer?.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escXml(buyer?.tax_id)}</cbc:CompanyID>
        <cbc:TaxLevelCode>${escXml(buyer?.branch_number ?? '00000')}</cbc:TaxLevelCode>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(buyer?.address)}</cbc:StreetName>
        <cac:Country>
          <cbc:IdentificationCode>TH</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="THB">${toBaht(vatAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="THB">${toBaht(subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="THB">${toBaht(vatAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>VAT</cbc:ID>
        <cbc:Percent>7</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="THB">${toBaht(subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="THB">${toBaht(subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="THB">${toBaht(grandTotal)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="THB">${toBaht(grandTotal)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <!-- Digital Signature Placeholder -->
  <cac:Signature>
    <cbc:ID>placeholder-signature</cbc:ID>
    <cbc:Note>Digital signature to be applied by authorized signing service</cbc:Note>
  </cac:Signature>${lineItemsXml}
</Invoice>`;

      void reply
        .header('Content-Type', 'application/xml; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="e-tax-invoice-${inv.invoice_number}.xml"`);
      return xml;
    },
  );
}
