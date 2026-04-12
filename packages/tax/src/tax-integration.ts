/**
 * Tax Integration — hooks into invoice/bill creation for auto tax calculation.
 *
 * Computes a full tax breakdown (subtotal + VAT - WHT = grand total)
 * for a set of line items, and provides GL account mappings for posting.
 *
 * Story: 11.2
 */

import type {
  TaxLineBreakdown,
  TransactionTaxBreakdown,
  VatApplicability,
  WhtIncomeType,
} from './types.js';
import { calculateVATDirect } from './vat.js';
import { calculateWHTDirect } from './wht.js';
import type { TaxRateService } from './tax-rate-service.js';

// ---------------------------------------------------------------------------
// GL Account codes for tax entries (TFAC standard chart)
// ---------------------------------------------------------------------------

/** VAT Payable — liability account (2xxx range). */
const VAT_PAYABLE_GL = '2110';

/** WHT Receivable — asset account (1xxx range). */
const WHT_RECEIVABLE_GL = '1170';

// ---------------------------------------------------------------------------
// Line item input
// ---------------------------------------------------------------------------

/**
 * Input for a single transaction line item.
 */
export interface TaxLineInput {
  /** Reference/description for this line. */
  readonly lineRef: string;
  /** Amount in satang (before tax). */
  readonly amountSatang: bigint;
  /** VAT applicability: 'standard' = taxable, others = exempt from VAT. */
  readonly vatApplicable: VatApplicability;
  /** WHT income type, or null if WHT does not apply. */
  readonly whtIncomeType: WhtIncomeType | null;
}

// ---------------------------------------------------------------------------
// Main integration function
// ---------------------------------------------------------------------------

/**
 * Calculate the full tax breakdown for a transaction (invoice or bill).
 *
 * For each line item:
 *   - If vatApplicable, compute VAT at the effective rate
 *   - If whtIncomeType is set, compute WHT at the income-type rate
 *   - Net amount = subtotal + VAT - WHT
 *
 * @param lines           - Array of line items.
 * @param transactionDate - Date for rate lookup.
 * @param rateService     - Tax rate service instance.
 * @param tenantId        - Tenant for rate lookup.
 * @returns Full transaction tax breakdown.
 */
export async function calculateTransactionTax(
  lines: readonly TaxLineInput[],
  transactionDate: Date,
  rateService: TaxRateService,
  tenantId: string,
): Promise<TransactionTaxBreakdown> {
  const lineBreakdowns: TaxLineBreakdown[] = [];

  let subtotal = 0n;
  let totalVat = 0n;
  let totalWht = 0n;

  for (const line of lines) {
    let vatResult = null;
    let whtResult = null;
    let lineNet = line.amountSatang;

    // VAT calculation — only 'standard' classification is taxable
    if (line.vatApplicable === 'standard') {
      const { rateBasisPoints, effectiveFrom } = await rateService.getVatRate(
        tenantId,
        transactionDate,
      );
      vatResult = calculateVATDirect(line.amountSatang, rateBasisPoints, effectiveFrom);
      lineNet = lineNet + vatResult.taxAmount;
      totalVat = totalVat + vatResult.taxAmount;
    }

    // WHT calculation
    if (line.whtIncomeType !== null) {
      const { rateBasisPoints, effectiveFrom } = await rateService.getWhtRate(
        line.whtIncomeType,
        tenantId,
        transactionDate,
      );
      whtResult = calculateWHTDirect(line.amountSatang, rateBasisPoints, effectiveFrom);
      lineNet = lineNet - whtResult.taxAmount;
      totalWht = totalWht + whtResult.taxAmount;
    }

    subtotal = subtotal + line.amountSatang;

    lineBreakdowns.push({
      lineRef: line.lineRef,
      subtotal: line.amountSatang,
      vat: vatResult,
      wht: whtResult,
      netAmount: lineNet,
    });
  }

  return {
    subtotal,
    totalVat,
    totalWht,
    grandTotal: subtotal + totalVat - totalWht,
    lines: lineBreakdowns,
    vatGlAccount: VAT_PAYABLE_GL,
    whtGlAccount: WHT_RECEIVABLE_GL,
  };
}
