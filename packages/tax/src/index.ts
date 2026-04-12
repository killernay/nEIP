/**
 * @neip/tax — Tax calculation engine for Thai SMEs.
 *
 * Provides VAT, WHT, and Thai Buddhist Era date utilities.
 * All monetary calculations use bigint satang — NO floating point.
 *
 * Stories: 11.1, 11.2, 11.3
 */

// Types
export type {
  TaxType,
  VatApplicability,
  WhtIncomeType,
  TaxResult,
  TaxRate,
  TaxLineBreakdown,
  TransactionTaxBreakdown,
} from './types.js';

// Rounding
export { calculateTaxAmount } from './rounding.js';

// VAT (Story 11.1)
export { calculateVAT, calculateVATDirect } from './vat.js';

// WHT (Story 11.1)
export { calculateWHT, calculateWHTDirect } from './wht.js';

// Tax Rate Service (Story 11.1)
export { TaxRateService } from './tax-rate-service.js';
export type { TaxRateRepository } from './tax-rate-service.js';

// Tax Integration (Story 11.2)
export { calculateTransactionTax } from './tax-integration.js';
export type { TaxLineInput } from './tax-integration.js';

// Thai Date Utilities (Story 11.3)
export {
  toThaiYear,
  toChristianYear,
  formatThaiDate,
  formatThaiDateShort,
} from './thai-date.js';
