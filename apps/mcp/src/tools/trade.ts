import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiCall } from '../api.js';
import { wrapTool } from './wrap-tool.js';

export function registerTradeTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // Tool: list_incoterms
  // ---------------------------------------------------------------------------

  server.tool(
    'list_incoterms',
    'ดู Incoterms — List international commercial terms (EXW, FOB, CIF, etc.)',
    {},
    wrapTool(() => apiCall('GET', '/incoterms')),
  );

  // ---------------------------------------------------------------------------
  // Tool: create_trade_declaration
  // ---------------------------------------------------------------------------

  server.tool(
    'create_trade_declaration',
    'สร้างใบขนสินค้า — Create an import/export customs declaration',
    {
      documentNumber: z.string().describe('Declaration document number'),
      type: z.enum(['import', 'export']).describe('import or export'),
      customsDate: z.string().optional().describe('Customs date (YYYY-MM-DD)'),
      incotermCode: z.string().optional().describe('Incoterm code (e.g. FOB, CIF)'),
      referenceType: z.enum(['po', 'so']).optional().describe('Reference type: po or so'),
      referenceId: z.string().optional().describe('PO or SO ID'),
      countryOfOrigin: z.string().optional().describe('Country of origin'),
      countryOfDestination: z.string().optional().describe('Country of destination'),
      currencyCode: z.string().optional().describe('Currency code (default THB)'),
      exchangeRate: z.number().optional().describe('Exchange rate to THB'),
      customsBroker: z.string().optional().describe('Customs broker name'),
      lines: z.array(z.object({
        productId: z.string().optional(),
        hsCode: z.string().optional(),
        description: z.string().optional(),
        quantity: z.number(),
        unit: z.string().optional(),
        unitValueSatang: z.string(),
        customsDutyRateBp: z.number().optional().describe('Customs duty rate in basis points'),
        exciseRateBp: z.number().optional().describe('Excise rate in basis points'),
      })).optional().describe('Declaration line items'),
    },
    wrapTool((args) => apiCall('POST', '/trade-declarations', args)),
  );

  // ---------------------------------------------------------------------------
  // Tool: list_trade_declarations
  // ---------------------------------------------------------------------------

  server.tool(
    'list_trade_declarations',
    'ดูรายการใบขนสินค้า — List trade declarations with optional filters',
    {
      type: z.enum(['import', 'export']).optional().describe('Filter by type'),
      status: z.string().optional().describe('Filter by status'),
    },
    wrapTool((args) => {
      const params = new URLSearchParams();
      if (args.type) params.set('type', args.type);
      if (args.status) params.set('status', args.status);
      const qs = params.toString();
      return apiCall('GET', `/trade-declarations${qs ? `?${qs}` : ''}`);
    }),
  );

  // ---------------------------------------------------------------------------
  // Tool: submit_trade_declaration
  // ---------------------------------------------------------------------------

  server.tool(
    'submit_trade_declaration',
    'ยื่นใบขนสินค้าต่อศุลกากร — Submit declaration to customs',
    { declarationId: z.string().describe('Trade declaration ID') },
    wrapTool(({ declarationId }) => apiCall('POST', `/trade-declarations/${declarationId}/submit`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: clear_trade_declaration
  // ---------------------------------------------------------------------------

  server.tool(
    'clear_trade_declaration',
    'ผ่านพิธีการศุลกากร — Clear customs declaration (auto-calculates landed cost for imports)',
    { declarationId: z.string().describe('Trade declaration ID') },
    wrapTool(({ declarationId }) => apiCall('POST', `/trade-declarations/${declarationId}/clear`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: create_letter_of_credit
  // ---------------------------------------------------------------------------

  server.tool(
    'create_letter_of_credit',
    'สร้าง Letter of Credit — Create an import/export LC',
    {
      lcNumber: z.string().describe('LC number'),
      type: z.enum(['import', 'export']).describe('import or export'),
      issuingBank: z.string().describe('Issuing bank'),
      advisingBank: z.string().optional().describe('Advising bank'),
      beneficiary: z.string().describe('Beneficiary'),
      applicant: z.string().describe('Applicant'),
      amountSatang: z.string().describe('Amount in satang'),
      currencyCode: z.string().optional().describe('Currency code'),
      issueDate: z.string().optional().describe('Issue date (YYYY-MM-DD)'),
      expiryDate: z.string().describe('Expiry date (YYYY-MM-DD)'),
      referenceType: z.enum(['po', 'so']).optional(),
      referenceId: z.string().optional(),
      terms: z.string().optional(),
      documentsRequired: z.array(z.string()).optional(),
    },
    wrapTool((args) => apiCall('POST', '/letters-of-credit', args)),
  );

  // ---------------------------------------------------------------------------
  // Tool: list_letters_of_credit
  // ---------------------------------------------------------------------------

  server.tool(
    'list_letters_of_credit',
    'ดูรายการ L/C — List letters of credit',
    {
      type: z.enum(['import', 'export']).optional(),
      status: z.string().optional(),
    },
    wrapTool((args) => {
      const params = new URLSearchParams();
      if (args.type) params.set('type', args.type);
      if (args.status) params.set('status', args.status);
      const qs = params.toString();
      return apiCall('GET', `/letters-of-credit${qs ? `?${qs}` : ''}`);
    }),
  );

  // ---------------------------------------------------------------------------
  // Tool: issue_letter_of_credit
  // ---------------------------------------------------------------------------

  server.tool(
    'issue_letter_of_credit',
    'ออก L/C — Issue a letter of credit',
    { lcId: z.string().describe('Letter of credit ID') },
    wrapTool(({ lcId }) => apiCall('POST', `/letters-of-credit/${lcId}/issue`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: settle_letter_of_credit
  // ---------------------------------------------------------------------------

  server.tool(
    'settle_letter_of_credit',
    'ชำระ L/C — Settle a letter of credit',
    { lcId: z.string().describe('Letter of credit ID') },
    wrapTool(({ lcId }) => apiCall('POST', `/letters-of-credit/${lcId}/settle`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: cancel_letter_of_credit
  // ---------------------------------------------------------------------------

  server.tool(
    'cancel_letter_of_credit',
    'ยกเลิก L/C — Cancel a letter of credit',
    { lcId: z.string().describe('Letter of credit ID') },
    wrapTool(({ lcId }) => apiCall('POST', `/letters-of-credit/${lcId}/cancel`)),
  );

  // ---------------------------------------------------------------------------
  // Tool: calculate_landed_cost
  // ---------------------------------------------------------------------------

  server.tool(
    'calculate_landed_cost',
    'คำนวณต้นทุนนำเข้า — Calculate landed cost for imported goods',
    {
      poId: z.string().describe('Purchase Order ID'),
      productId: z.string().describe('Product ID'),
      quantity: z.number().describe('Quantity'),
      purchasePriceSatang: z.string().describe('Purchase price in satang'),
      freightSatang: z.string().optional().describe('Freight cost in satang'),
      insuranceSatang: z.string().optional().describe('Insurance cost in satang'),
      customsDutySatang: z.string().optional().describe('Customs duty in satang'),
      exciseSatang: z.string().optional().describe('Excise tax in satang'),
      handlingSatang: z.string().optional().describe('Handling cost in satang'),
      otherSatang: z.string().optional().describe('Other costs in satang'),
    },
    wrapTool((args) => apiCall('POST', '/landed-costs/calculate', args)),
  );

  // ---------------------------------------------------------------------------
  // Tool: get_landed_costs
  // ---------------------------------------------------------------------------

  server.tool(
    'get_landed_costs',
    'ดูต้นทุนนำเข้าตาม PO — View landed costs for a purchase order',
    { poId: z.string().describe('Purchase Order ID') },
    wrapTool(({ poId }) => apiCall('GET', `/landed-costs/${poId}`)),
  );
}
