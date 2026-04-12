/**
 * Tax Engine Tests — Golden file tests for VAT, WHT, rounding, and Thai date.
 *
 * Pattern: Given-When-Then (Arrange-Act-Assert).
 * All golden file scenarios are loaded from JSON and run as parameterised tests.
 *
 * Story: 11.3
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { calculateTaxAmount } from './rounding.js';
import { calculateVATDirect } from './vat.js';
import { calculateWHTDirect } from './wht.js';
import { calculateVAT } from './vat.js';
import { calculateWHT } from './wht.js';
import { TaxRateService } from './tax-rate-service.js';
import { calculateTransactionTax } from './tax-integration.js';
import type { TaxLineInput } from './tax-integration.js';
import {
  toThaiYear,
  toChristianYear,
  formatThaiDate,
  formatThaiDateShort,
} from './thai-date.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const goldenDir = join(currentDir, 'tests', 'golden-files');

function loadGoldenFile<T>(filename: string): T {
  const raw = readFileSync(join(goldenDir, filename), 'utf-8');
  return JSON.parse(raw) as T;
}

interface VatScenario {
  name: string;
  amountSatang: string;
  rateBasisPoints: number;
  expectedTaxSatang: string;
  expectedTotalSatang: string;
}

interface WhtScenario {
  name: string;
  incomeType: string;
  amountSatang: string;
  rateBasisPoints: number;
  expectedTaxSatang: string;
  expectedNetSatang: string;
}

interface RoundingScenario {
  name: string;
  amountSatang: string;
  rateBasisPoints: number;
  expectedTaxSatang: string;
}

interface RateChangeScenario {
  name: string;
  transactionDate: string;
  rateChangeDate: string;
  oldRateBasisPoints: number;
  newRateBasisPoints: number;
  amountSatang: string;
  expectedRateBasisPoints: number;
  expectedTaxSatang: string;
}

// ===========================================================================
// Story 11.1: VAT Calculation — Golden File Tests
// ===========================================================================

describe('VAT Calculation (Story 11.1)', () => {
  const goldenData = loadGoldenFile<{ scenarios: VatScenario[] }>('vat-scenarios.json');

  describe('Given golden VAT scenarios', () => {
    for (const scenario of goldenData.scenarios) {
      it(`When calculating: ${scenario.name}, Then tax and total match`, () => {
        // Given
        const amount = BigInt(scenario.amountSatang);
        const effectiveDate = new Date('1992-01-01T00:00:00.000Z');

        // When
        const result = calculateVATDirect(amount, scenario.rateBasisPoints, effectiveDate);

        // Then
        expect(result.taxAmount).toBe(BigInt(scenario.expectedTaxSatang));
        expect(result.totalAmount).toBe(BigInt(scenario.expectedTotalSatang));
        expect(result.baseAmount).toBe(amount);
        expect(result.ratePercent).toBe(scenario.rateBasisPoints / 100);
      });
    }
  });

  describe('Given the TaxRateService with no repository (statutory defaults)', () => {
    it('When calculating VAT via async path, Then uses 7% default', async () => {
      // Given
      const rateService = new TaxRateService(null);
      const amount = 10000n; // ฿100.00
      const txnDate = new Date('2024-07-15');

      // When
      const result = await calculateVAT(amount, txnDate, rateService, 'tenant-1');

      // Then
      expect(result.taxAmount).toBe(700n);
      expect(result.totalAmount).toBe(10700n);
      expect(result.ratePercent).toBe(7);
    });
  });
});

// ===========================================================================
// Story 11.1: WHT Calculation — Golden File Tests
// ===========================================================================

describe('WHT Calculation (Story 11.1)', () => {
  const goldenData = loadGoldenFile<{ scenarios: WhtScenario[] }>('wht-scenarios.json');

  describe('Given golden WHT scenarios', () => {
    for (const scenario of goldenData.scenarios) {
      it(`When calculating: ${scenario.name}, Then tax and net match`, () => {
        // Given
        const amount = BigInt(scenario.amountSatang);
        const effectiveDate = new Date('1992-01-01T00:00:00.000Z');

        // When
        const result = calculateWHTDirect(amount, scenario.rateBasisPoints, effectiveDate);

        // Then
        expect(result.taxAmount).toBe(BigInt(scenario.expectedTaxSatang));
        expect(result.totalAmount).toBe(BigInt(scenario.expectedNetSatang));
        expect(result.baseAmount).toBe(amount);
      });
    }
  });

  describe('Given the TaxRateService with no repository (statutory defaults)', () => {
    it('When calculating WHT for services, Then uses 3% default', async () => {
      // Given
      const rateService = new TaxRateService(null);
      const amount = 10000000n; // ฿100,000.00
      const txnDate = new Date('2024-07-15');

      // When
      const result = await calculateWHT(amount, 'services', txnDate, rateService, 'tenant-1');

      // Then
      expect(result.taxAmount).toBe(300000n);
      expect(result.totalAmount).toBe(9700000n);
      expect(result.ratePercent).toBe(3);
    });

    it('When calculating WHT for unknown income type, Then throws', async () => {
      // Given
      const rateService = new TaxRateService(null);

      // When/Then
      await expect(
        calculateWHT(10000n, 'unknown_type', new Date(), rateService, 'tenant-1'),
      ).rejects.toThrow('Unknown WHT income type');
    });
  });
});

// ===========================================================================
// Story 11.1: Rounding Edge Cases — Golden File Tests
// ===========================================================================

describe('Rounding Edge Cases (Story 11.1)', () => {
  const goldenData = loadGoldenFile<{ scenarios: RoundingScenario[] }>('rounding-edge-cases.json');

  describe('Given golden rounding scenarios', () => {
    for (const scenario of goldenData.scenarios) {
      it(`When rounding: ${scenario.name}, Then matches expected`, () => {
        // Given
        const amount = BigInt(scenario.amountSatang);

        // When
        const tax = calculateTaxAmount(amount, scenario.rateBasisPoints);

        // Then
        expect(tax).toBe(BigInt(scenario.expectedTaxSatang));
      });
    }
  });

  describe('Given invalid inputs', () => {
    it('When rateBasisPoints is negative, Then throws RangeError', () => {
      expect(() => calculateTaxAmount(100n, -1)).toThrow(RangeError);
    });

    it('When rateBasisPoints is not an integer, Then throws RangeError', () => {
      expect(() => calculateTaxAmount(100n, 3.5)).toThrow(RangeError);
    });

    it('When amountSatang is negative, Then throws RangeError', () => {
      expect(() => calculateTaxAmount(-100n, 700)).toThrow(RangeError);
    });
  });
});

// ===========================================================================
// Story 11.1: Rate Change Boundaries — Golden File Tests
// ===========================================================================

describe('Rate Change Date Boundaries (Story 11.1)', () => {
  const goldenData = loadGoldenFile<{ scenarios: RateChangeScenario[] }>('rate-change-boundaries.json');

  describe('Given golden rate change scenarios with mock repository', () => {
    for (const scenario of goldenData.scenarios) {
      it(`When checking: ${scenario.name}, Then correct rate applied`, async () => {
        // Given: a mock repo with old rate and new rate
        const rateChangeDate = new Date(scenario.rateChangeDate);
        const txnDate = new Date(scenario.transactionDate);
        const amount = BigInt(scenario.amountSatang);

        const mockRepo = {
          findEffectiveRate: async (params: {
            taxType: string;
            incomeType: string | null;
            tenantId: string;
            transactionDate: Date;
          }) => {
            // If transaction is on/after the rate change, return new rate
            if (params.transactionDate >= rateChangeDate) {
              return {
                id: 'rate-new',
                taxType: 'vat' as const,
                rateBasisPoints: scenario.newRateBasisPoints,
                incomeType: null,
                effectiveFrom: rateChangeDate,
                tenantId: params.tenantId,
              };
            }
            // If before the rate change date, but we have an old custom rate
            // Only return custom rate if there's a custom old rate different from default
            if (scenario.oldRateBasisPoints !== 700) {
              return {
                id: 'rate-old',
                taxType: 'vat' as const,
                rateBasisPoints: scenario.oldRateBasisPoints,
                incomeType: null,
                effectiveFrom: new Date('1992-01-01T00:00:00.000Z'),
                tenantId: params.tenantId,
              };
            }
            // No custom rate before the change date — falls through to default
            return null;
          },
        };

        const rateService = new TaxRateService(mockRepo);

        // When
        const result = await calculateVAT(amount, txnDate, rateService, 'tenant-1');

        // Then
        expect(result.taxAmount).toBe(BigInt(scenario.expectedTaxSatang));
        expect(result.ratePercent).toBe(scenario.expectedRateBasisPoints / 100);
      });
    }
  });
});

// ===========================================================================
// Story 11.1: TaxRateService
// ===========================================================================

describe('TaxRateService (Story 11.1)', () => {
  describe('Given no repository', () => {
    const service = new TaxRateService(null);

    it('When getting VAT rate, Then returns 7% statutory default', async () => {
      const rate = await service.getVatRate('tenant-1', new Date());
      expect(rate.rateBasisPoints).toBe(700);
    });

    it('When getting WHT rate for services, Then returns 3%', async () => {
      const rate = await service.getWhtRate('services', 'tenant-1', new Date());
      expect(rate.rateBasisPoints).toBe(300);
    });

    it('When getting WHT rate for rent, Then returns 5%', async () => {
      const rate = await service.getWhtRate('rent', 'tenant-1', new Date());
      expect(rate.rateBasisPoints).toBe(500);
    });

    it('When getting WHT rate for dividends, Then returns 10%', async () => {
      const rate = await service.getWhtRate('dividends', 'tenant-1', new Date());
      expect(rate.rateBasisPoints).toBe(1000);
    });

    it('When listing income types, Then returns all 8 types', () => {
      const types = service.getAvailableWhtIncomeTypes();
      expect(types).toHaveLength(8);
      expect(types).toContain('services');
      expect(types).toContain('rent');
      expect(types).toContain('dividends');
    });
  });
});

// ===========================================================================
// Story 11.2: Tax Integration
// ===========================================================================

describe('Tax Integration (Story 11.2)', () => {
  describe('Given line items with VAT and WHT', () => {
    it('When calculating transaction tax, Then breakdown is correct', async () => {
      // Given
      const rateService = new TaxRateService(null);
      const lines: TaxLineInput[] = [
        {
          lineRef: 'Line 1 — consulting service',
          amountSatang: 10000000n, // ฿100,000.00
          vatApplicable: 'standard',
          whtIncomeType: 'services',
        },
        {
          lineRef: 'Line 2 — office rent',
          amountSatang: 3000000n, // ฿30,000.00
          vatApplicable: 'standard',
          whtIncomeType: 'rent',
        },
      ];

      // When
      const result = await calculateTransactionTax(
        lines,
        new Date('2024-07-15'),
        rateService,
        'tenant-1',
      );

      // Then
      expect(result.subtotal).toBe(13000000n); // ฿130,000.00
      expect(result.totalVat).toBe(910000n);   // 7% of ฿130,000 = ฿9,100.00
      expect(result.totalWht).toBe(450000n);   // 3% of ฿100k + 5% of ฿30k = ฿4,500.00
      expect(result.grandTotal).toBe(13460000n); // ฿130k + ฿9,100 - ฿4,500 = ฿134,600.00
      expect(result.lines).toHaveLength(2);
      expect(result.vatGlAccount).toBe('2110');
      expect(result.whtGlAccount).toBe('1170');
    });

    it('When a line has VAT but no WHT, Then WHT is null for that line', async () => {
      // Given
      const rateService = new TaxRateService(null);
      const lines: TaxLineInput[] = [
        {
          lineRef: 'Product sale',
          amountSatang: 5000000n, // ฿50,000.00
          vatApplicable: 'standard',
          whtIncomeType: null,
        },
      ];

      // When
      const result = await calculateTransactionTax(
        lines,
        new Date('2024-07-15'),
        rateService,
        'tenant-1',
      );

      // Then
      const line = result.lines[0];
      expect(line).toBeDefined();
      expect(line!.vat).not.toBeNull();
      expect(line!.wht).toBeNull();
      expect(result.totalWht).toBe(0n);
      expect(result.grandTotal).toBe(5350000n); // ฿50k + ฿3,500 VAT
    });

    it('When a line is VAT-exempt with WHT, Then VAT is null', async () => {
      // Given
      const rateService = new TaxRateService(null);
      const lines: TaxLineInput[] = [
        {
          lineRef: 'Exempt service with WHT',
          amountSatang: 1000000n, // ฿10,000.00
          vatApplicable: 'exempt',
          whtIncomeType: 'professional',
        },
      ];

      // When
      const result = await calculateTransactionTax(
        lines,
        new Date('2024-07-15'),
        rateService,
        'tenant-1',
      );

      // Then
      const line = result.lines[0];
      expect(line).toBeDefined();
      expect(line!.vat).toBeNull();
      expect(line!.wht).not.toBeNull();
      expect(result.totalVat).toBe(0n);
      expect(result.totalWht).toBe(30000n); // 3% of ฿10k
      expect(result.grandTotal).toBe(970000n); // ฿10k - ฿300
    });
  });
});

// ===========================================================================
// Story 11.3: Thai Date (Buddhist Era) Conversion
// ===========================================================================

describe('Thai Date — Buddhist Era Conversion (Story 11.3)', () => {
  describe('toThaiYear', () => {
    it('Given 2024 CE, When converting, Then returns 2567 BE', () => {
      expect(toThaiYear(2024)).toBe(2567);
    });

    it('Given 2000 CE, When converting, Then returns 2543 BE', () => {
      expect(toThaiYear(2000)).toBe(2543);
    });

    it('Given 1 CE, When converting, Then returns 544 BE', () => {
      expect(toThaiYear(1)).toBe(544);
    });

    it('Given non-integer, When converting, Then throws RangeError', () => {
      expect(() => toThaiYear(2024.5)).toThrow(RangeError);
    });
  });

  describe('toChristianYear', () => {
    it('Given 2567 BE, When converting, Then returns 2024 CE', () => {
      expect(toChristianYear(2567)).toBe(2024);
    });

    it('Given 2543 BE, When converting, Then returns 2000 CE', () => {
      expect(toChristianYear(2543)).toBe(2000);
    });

    it('Given non-integer, When converting, Then throws RangeError', () => {
      expect(() => toChristianYear(2567.5)).toThrow(RangeError);
    });
  });

  describe('toThaiYear and toChristianYear are inverses', () => {
    const years = [1900, 2000, 2024, 2025, 2100];
    for (const year of years) {
      it(`Given ${String(year)} CE, When round-tripping, Then returns ${String(year)}`, () => {
        expect(toChristianYear(toThaiYear(year))).toBe(year);
      });
    }
  });

  describe('formatThaiDate', () => {
    it('Given 2024-07-15, When formatting, Then returns Thai format', () => {
      const date = new Date('2024-07-15T00:00:00.000Z');
      expect(formatThaiDate(date)).toBe('15 กรกฎาคม พ.ศ. 2567');
    });

    it('Given 2024-01-01, When formatting, Then returns January in Thai', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      expect(formatThaiDate(date)).toBe('1 มกราคม พ.ศ. 2567');
    });

    it('Given 2024-12-31, When formatting, Then returns December in Thai', () => {
      const date = new Date('2024-12-31T00:00:00.000Z');
      expect(formatThaiDate(date)).toBe('31 ธันวาคม พ.ศ. 2567');
    });
  });

  describe('formatThaiDateShort', () => {
    it('Given 2024-01-05, When formatting short, Then returns abbreviated', () => {
      const date = new Date('2024-01-05T00:00:00.000Z');
      expect(formatThaiDateShort(date)).toBe('5 ม.ค. 2567');
    });

    it('Given 2024-07-15, When formatting short, Then returns abbreviated', () => {
      const date = new Date('2024-07-15T00:00:00.000Z');
      expect(formatThaiDateShort(date)).toBe('15 ก.ค. 2567');
    });
  });
});
