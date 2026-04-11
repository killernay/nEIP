/**
 * CategorizationAgent — AI agent for smart GL account categorization.
 *
 * Implements Story 6.3: rule-based keyword matching for bank transaction
 * categorization with learning from corrections.
 *
 * Input: bank transaction (description, amount, date)
 * Output: suggested GL account with confidence score
 *
 * Architecture references: AR11, FR17-FR23
 * Story: 6.3
 */

import type {
  AgentContext,
  AgentResult,
} from '../types/agent-types.js';
import { BaseAgent, AgentTrace } from './base-agent.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface CategoryRule {
  readonly id: string;
  readonly keywordPattern: string;
  readonly accountId: string;
  readonly accountCode: string;
  readonly accountName: string;
  readonly hitCount: number;
}

export interface CategorizationInput {
  readonly description: string;
  readonly amount: bigint;
  readonly date?: string;
  /** Available rules — loaded from categorization_rules table */
  readonly rules: ReadonlyArray<CategoryRule>;
}

export interface CategorySuggestion {
  readonly accountId: string;
  readonly accountCode: string;
  readonly accountName: string;
  readonly confidence: number;
  readonly matchedKeyword: string;
  readonly reason: string;
}

export interface CategorizationOutput {
  readonly suggestions: ReadonlyArray<CategorySuggestion>;
  readonly bestMatch: CategorySuggestion | null;
  readonly description: string;
}

// ---------------------------------------------------------------------------
// Default keyword rules (built-in Thai/English patterns)
// ---------------------------------------------------------------------------

const DEFAULT_RULES: ReadonlyArray<{
  pattern: RegExp;
  accountCode: string;
  accountName: string;
  keyword: string;
}> = [
  // Revenue patterns
  { pattern: /(?:sale|ขาย|รายรับ|revenue)/i, accountCode: '4100', accountName: 'Sales Revenue', keyword: 'sale/ขาย' },
  { pattern: /(?:interest|ดอกเบี้ย)/i, accountCode: '4200', accountName: 'Interest Income', keyword: 'interest/ดอกเบี้ย' },
  // Expense patterns
  { pattern: /(?:rent|ค่าเช่า|เช่า)/i, accountCode: '5200', accountName: 'Rent Expense', keyword: 'rent/ค่าเช่า' },
  { pattern: /(?:salary|เงินเดือน|payroll)/i, accountCode: '5100', accountName: 'Salary Expense', keyword: 'salary/เงินเดือน' },
  { pattern: /(?:electric|ไฟฟ้า|utility|utilities|สาธารณูปโภค)/i, accountCode: '5300', accountName: 'Utilities Expense', keyword: 'utility/สาธารณูปโภค' },
  { pattern: /(?:water|น้ำประปา|ประปา)/i, accountCode: '5300', accountName: 'Utilities Expense', keyword: 'water/ประปา' },
  { pattern: /(?:internet|อินเทอร์เน็ต|โทรศัพท์|phone|telecom)/i, accountCode: '5400', accountName: 'Communication Expense', keyword: 'internet/โทรศัพท์' },
  { pattern: /(?:office|สำนักงาน|stationery|เครื่องเขียน)/i, accountCode: '5500', accountName: 'Office Supplies', keyword: 'office/สำนักงาน' },
  { pattern: /(?:transport|ขนส่ง|delivery|จัดส่ง)/i, accountCode: '5600', accountName: 'Transportation Expense', keyword: 'transport/ขนส่ง' },
  { pattern: /(?:insurance|ประกัน)/i, accountCode: '5700', accountName: 'Insurance Expense', keyword: 'insurance/ประกัน' },
  { pattern: /(?:tax|ภาษี|vat|withholding)/i, accountCode: '2100', accountName: 'Tax Payable', keyword: 'tax/ภาษี' },
  { pattern: /(?:bank.*(?:fee|charge)|ค่าธรรมเนียม)/i, accountCode: '5800', accountName: 'Bank Charges', keyword: 'bank fee/ค่าธรรมเนียม' },
];

// ---------------------------------------------------------------------------
// CategorizationAgent
// ---------------------------------------------------------------------------

export class CategorizationAgent extends BaseAgent<
  CategorizationInput,
  CategorizationOutput
> {
  constructor(config?: { agentId?: string; timeoutMs?: number }) {
    super({
      agentId: config?.agentId ?? 'categorization-agent',
      timeoutMs: config?.timeoutMs ?? 10_000,
    });
  }

  protected async executeCore(
    input: CategorizationInput,
    context: AgentContext,
    trace: AgentTrace,
  ): Promise<AgentResult<CategorizationOutput>> {
    const startMs = Date.now();

    trace.addStep('reasoning', 'Categorization: analyzing transaction', {
      description: input.description.slice(0, 100),
      amount: input.amount.toString(),
      ruleCount: input.rules.length,
      tenantId: context.tenantId,
    });

    const suggestions: CategorySuggestion[] = [];
    const descLower = input.description.toLowerCase();

    // First: match against tenant-specific rules (higher priority due to hit counts)
    for (const rule of input.rules) {
      if (descLower.includes(rule.keywordPattern.toLowerCase())) {
        // Boost confidence by hit count (learned from corrections)
        const hitBoost = Math.min(0.2, rule.hitCount * 0.02);
        const confidence = Math.min(0.95, 0.75 + hitBoost);

        suggestions.push({
          accountId: rule.accountId,
          accountCode: rule.accountCode,
          accountName: rule.accountName,
          confidence,
          matchedKeyword: rule.keywordPattern,
          reason: `Matched tenant rule "${rule.keywordPattern}" (${rule.hitCount} prior matches)`,
        });
      }
    }

    trace.addStep('reasoning', `Tenant rules matched: ${suggestions.length}`);

    // Second: match against default built-in rules
    for (const rule of DEFAULT_RULES) {
      if (rule.pattern.test(input.description)) {
        // Check if we already have a match for this account code
        const existing = suggestions.find((s) => s.accountCode === rule.accountCode);
        if (!existing) {
          suggestions.push({
            accountId: '',
            accountCode: rule.accountCode,
            accountName: rule.accountName,
            confidence: 0.6,
            matchedKeyword: rule.keyword,
            reason: `Matched default pattern "${rule.keyword}"`,
          });
        }
      }
    }

    trace.addStep('reasoning', `Total suggestions after default rules: ${suggestions.length}`);

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = suggestions.length > 0 ? suggestions[0]! : null;

    trace.addStep('final-answer', 'Categorization complete', {
      suggestionCount: suggestions.length,
      bestMatch: bestMatch?.accountCode ?? 'none',
      bestConfidence: bestMatch?.confidence ?? 0,
    });

    const output: CategorizationOutput = {
      suggestions,
      bestMatch,
      description: input.description,
    };

    const confidence = bestMatch?.confidence ?? 0.1;
    return this.buildSuccess(output, confidence, trace, startMs);
  }
}
