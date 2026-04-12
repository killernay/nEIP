/**
 * Shared types for tax calculations.
 *
 * All monetary amounts are in bigint satang (100 satang = 1 THB).
 * No floating-point arithmetic is used anywhere in tax calculations.
 *
 * Story: 11.1
 */

/** Tax type discriminator — VAT or WHT. */
export type TaxType = 'vat' | 'wht';

/**
 * VAT applicability classification for tax line items.
 * - 'standard': subject to standard VAT rate
 * - 'exempt': VAT-exempt goods/services (ยกเว้นภาษีมูลค่าเพิ่ม)
 * - 'zero_rated': 0% VAT (e.g. exports)
 * - 'out_of_scope': outside VAT system
 */
export type VatApplicability = 'standard' | 'exempt' | 'zero_rated' | 'out_of_scope';

/**
 * WHT income type categories as defined by the Thai Revenue Department.
 * Each maps to a specific withholding rate.
 */
export type WhtIncomeType =
  | 'dividends'
  | 'rent'
  | 'professional'
  | 'services'
  | 'prizes'
  | 'advertising'
  | 'transport'
  | 'insurance';

/**
 * Result of a tax calculation.
 * All amounts are bigint satang — no floating-point.
 */
export interface TaxResult {
  /** Original amount before tax (satang). */
  readonly baseAmount: bigint;
  /** Calculated tax amount (satang), rounded half-up per Thai rules. */
  readonly taxAmount: bigint;
  /** baseAmount + taxAmount for VAT; baseAmount - taxAmount for WHT (satang). */
  readonly totalAmount: bigint;
  /** Tax rate as a percentage (e.g. 7 for 7%). Stored as integer basis points / 100. */
  readonly ratePercent: number;
  /** Effective date of the rate used. */
  readonly rateEffectiveDate: Date;
}

/**
 * A tax rate record as stored in the database.
 */
export interface TaxRate {
  readonly id: string;
  readonly taxType: TaxType;
  /** Rate in basis points (e.g. 700 = 7.00%). Stored as integer to avoid float. */
  readonly rateBasisPoints: number;
  /** WHT income type — null for VAT rates. */
  readonly incomeType: string | null;
  /** Date from which this rate is effective. */
  readonly effectiveFrom: Date;
  /** Tenant that owns this rate. */
  readonly tenantId: string;
}

/**
 * Tax breakdown for an invoice/bill line item.
 * Story: 11.2
 */
export interface TaxLineBreakdown {
  /** Line item description or reference. */
  readonly lineRef: string;
  /** Subtotal amount before any tax (satang). */
  readonly subtotal: bigint;
  /** VAT calculation result, or null if VAT-exempt. */
  readonly vat: TaxResult | null;
  /** WHT calculation result, or null if no WHT applies. */
  readonly wht: TaxResult | null;
  /** Net amount after VAT and WHT: subtotal + VAT - WHT (satang). */
  readonly netAmount: bigint;
}

/**
 * Full tax breakdown for a transaction (invoice/bill).
 * Story: 11.2
 */
export interface TransactionTaxBreakdown {
  /** Sum of all line subtotals (satang). */
  readonly subtotal: bigint;
  /** Total VAT across all lines (satang). */
  readonly totalVat: bigint;
  /** Total WHT across all lines (satang). */
  readonly totalWht: bigint;
  /** Grand total: subtotal + totalVat - totalWht (satang). */
  readonly grandTotal: bigint;
  /** Per-line breakdowns. */
  readonly lines: readonly TaxLineBreakdown[];
  /** GL account code for VAT Payable (liability 2xxx). */
  readonly vatGlAccount: string;
  /** GL account code for WHT Receivable (asset 1xxx). */
  readonly whtGlAccount: string;
}
