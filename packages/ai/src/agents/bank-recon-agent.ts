/**
 * BankReconAgent — AI agent for automatic bank reconciliation.
 *
 * Implements Story 6.4: rule-based matching of bank transactions to journal
 * entries using exact amount match, reference/description fuzzy match, and
 * date proximity scoring.
 *
 * Output categories:
 *   - auto_matched:      high confidence (≥0.9) — safe to auto-reconcile
 *   - suggested_matches: medium confidence — needs HITL review
 *   - unmatched:         no viable match found
 *
 * Architecture references: AR11, FR17-FR23
 * Story: 6.4
 */

import type {
  AgentContext,
  AgentResult,
} from '../types/agent-types.js';
import { BaseAgent, AgentTrace } from './base-agent.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface BankTransaction {
  readonly id: string;
  readonly date: string; // ISO 8601
  readonly amountSatang: bigint;
  readonly description: string;
  readonly reference: string;
}

export interface LedgerEntry {
  readonly journalEntryId: string;
  readonly entryNumber: string;
  readonly date: string;
  readonly amountSatang: bigint;
  readonly description: string;
  readonly reference: string;
}

export interface ReconMatch {
  readonly bankTransactionId: string;
  readonly journalEntryId: string;
  readonly entryNumber: string;
  readonly score: number;
  readonly reason: string;
}

export interface BankReconInput {
  readonly bankAccountId: string;
  readonly bankTransactions: ReadonlyArray<BankTransaction>;
  readonly ledgerEntries: ReadonlyArray<LedgerEntry>;
}

export interface BankReconOutput {
  readonly bankAccountId: string;
  readonly autoMatched: ReadonlyArray<ReconMatch>;
  readonly suggestedMatches: ReadonlyArray<ReconMatch>;
  readonly unmatched: ReadonlyArray<string>; // bank transaction IDs
  readonly summary: {
    readonly totalBankTransactions: number;
    readonly autoMatchedCount: number;
    readonly suggestedCount: number;
    readonly unmatchedCount: number;
  };
}

// ---------------------------------------------------------------------------
// Scoring weights
// ---------------------------------------------------------------------------

const WEIGHT_AMOUNT = 0.50;
const WEIGHT_REFERENCE = 0.30;
const WEIGHT_DATE = 0.20;

const AUTO_THRESHOLD = 0.90;
const SUGGEST_THRESHOLD = 0.50;

// ---------------------------------------------------------------------------
// BankReconAgent
// ---------------------------------------------------------------------------

export class BankReconAgent extends BaseAgent<
  BankReconInput,
  BankReconOutput
> {
  constructor(config?: { agentId?: string; timeoutMs?: number }) {
    super({
      agentId: config?.agentId ?? 'bank-recon-agent',
      timeoutMs: config?.timeoutMs ?? 30_000,
    });
  }

  protected async executeCore(
    input: BankReconInput,
    context: AgentContext,
    trace: AgentTrace,
  ): Promise<AgentResult<BankReconOutput>> {
    const startMs = Date.now();

    trace.addStep('reasoning', 'Bank reconciliation: starting', {
      bankAccountId: input.bankAccountId,
      bankTxCount: input.bankTransactions.length,
      ledgerEntryCount: input.ledgerEntries.length,
      tenantId: context.tenantId,
    });

    const autoMatched: ReconMatch[] = [];
    const suggestedMatches: ReconMatch[] = [];
    const unmatched: string[] = [];
    const matchedLedgerIds = new Set<string>();

    for (const tx of input.bankTransactions) {
      let bestMatch: ReconMatch | null = null;
      let bestScore = 0;

      for (const le of input.ledgerEntries) {
        if (matchedLedgerIds.has(le.journalEntryId)) continue;

        const amountScore = this.scoreAmount(tx.amountSatang, le.amountSatang);
        const refScore = this.scoreReference(tx.reference, tx.description, le.reference, le.description);
        const dateScore = this.scoreDate(tx.date, le.date);

        const composite = amountScore * WEIGHT_AMOUNT + refScore * WEIGHT_REFERENCE + dateScore * WEIGHT_DATE;

        if (composite > bestScore) {
          bestScore = composite;
          const reasons: string[] = [];
          if (amountScore === 1.0) reasons.push('exact amount');
          else if (amountScore > 0) reasons.push('near amount');
          if (refScore > 0.5) reasons.push('reference match');
          if (dateScore > 0.5) reasons.push('close date');

          bestMatch = {
            bankTransactionId: tx.id,
            journalEntryId: le.journalEntryId,
            entryNumber: le.entryNumber,
            score: Math.round(composite * 100) / 100,
            reason: reasons.join(', ') || 'weak signals',
          };
        }
      }

      if (bestMatch && bestScore >= AUTO_THRESHOLD) {
        autoMatched.push(bestMatch);
        matchedLedgerIds.add(bestMatch.journalEntryId);
      } else if (bestMatch && bestScore >= SUGGEST_THRESHOLD) {
        suggestedMatches.push(bestMatch);
        matchedLedgerIds.add(bestMatch.journalEntryId);
      } else {
        unmatched.push(tx.id);
      }
    }

    trace.addStep('final-answer', 'Bank reconciliation complete', {
      autoMatched: autoMatched.length,
      suggested: suggestedMatches.length,
      unmatched: unmatched.length,
    });

    const output: BankReconOutput = {
      bankAccountId: input.bankAccountId,
      autoMatched,
      suggestedMatches,
      unmatched,
      summary: {
        totalBankTransactions: input.bankTransactions.length,
        autoMatchedCount: autoMatched.length,
        suggestedCount: suggestedMatches.length,
        unmatchedCount: unmatched.length,
      },
    };

    const total = input.bankTransactions.length;
    const matchRate = total > 0 ? (autoMatched.length + suggestedMatches.length) / total : 0;
    const confidence = Math.max(0.3, matchRate * 0.9);

    return this.buildSuccess(output, confidence, trace, startMs);
  }

  // ---------------------------------------------------------------------------
  // Scoring helpers
  // ---------------------------------------------------------------------------

  private scoreAmount(bankAmount: bigint, ledgerAmount: bigint): number {
    if (bankAmount === ledgerAmount) return 1.0;

    // Absolute amounts match (bank might be negative for outflows)
    const absBankAmount = bankAmount < 0n ? -bankAmount : bankAmount;
    const absLedgerAmount = ledgerAmount < 0n ? -ledgerAmount : ledgerAmount;
    if (absBankAmount === absLedgerAmount) return 0.9;

    // Near match: within 1%
    if (absLedgerAmount === 0n) return 0;
    const diff = absBankAmount > absLedgerAmount
      ? absBankAmount - absLedgerAmount
      : absLedgerAmount - absBankAmount;
    const ratio = Number(diff) / Number(absLedgerAmount);
    if (ratio <= 0.01) return 0.7;

    return 0;
  }

  private scoreReference(
    bankRef: string,
    bankDesc: string,
    ledgerRef: string,
    ledgerDesc: string,
  ): number {
    // Exact reference match
    if (bankRef && ledgerRef && bankRef === ledgerRef) return 1.0;

    // Reference contained in description
    if (bankRef && ledgerDesc && ledgerDesc.includes(bankRef)) return 0.8;
    if (ledgerRef && bankDesc && bankDesc.includes(ledgerRef)) return 0.8;

    // Word overlap in descriptions
    const bankWords = new Set(
      (bankDesc + ' ' + bankRef).toLowerCase().split(/\s+/).filter((w) => w.length > 2),
    );
    const ledgerWords = new Set(
      (ledgerDesc + ' ' + ledgerRef).toLowerCase().split(/\s+/).filter((w) => w.length > 2),
    );

    if (bankWords.size === 0 || ledgerWords.size === 0) return 0;

    let overlap = 0;
    for (const word of bankWords) {
      if (ledgerWords.has(word)) overlap++;
    }

    return Math.min(1, overlap / Math.min(bankWords.size, ledgerWords.size));
  }

  private scoreDate(bankDate: string, ledgerDate: string): number {
    const bankMs = Date.parse(bankDate);
    const ledgerMs = Date.parse(ledgerDate);
    if (isNaN(bankMs) || isNaN(ledgerMs)) return 0;

    const diffDays = Math.abs(bankMs - ledgerMs) / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return 1.0;
    if (diffDays <= 1) return 0.9;
    if (diffDays <= 3) return 0.7;
    if (diffDays <= 7) return 0.4;
    if (diffDays <= 14) return 0.2;
    return 0;
  }
}
