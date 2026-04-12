/**
 * AnomalyDetectionAgent — AI agent for detecting anomalous journal entries.
 *
 * Implements Story 6.1: rule-based anomaly detection with full reasoning
 * transparency (FR18: no black-box AI). The agent does NOT require an LLM
 * for its core logic; all scoring is computed from ledger patterns.
 *
 * Detection patterns:
 *   1. Duplicate amounts posted on the same day
 *   2. Unusual-hours posting (outside 06:00-22:00)
 *   3. Round-number amounts over threshold
 *   4. Unusual account combinations
 *   5. Posting to rarely-used accounts
 *
 * Architecture references: AR11, FR17-FR23
 * Story: 6.1
 */

import type {
  AgentContext,
  AgentResult,
} from '../types/agent-types.js';
import { BaseAgent, AgentTrace } from './base-agent.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type AnomalySeverity = 'high' | 'medium' | 'low';

export type AnomalyType =
  | 'duplicate-amount'
  | 'unusual-hours'
  | 'round-number'
  | 'unusual-account-combo'
  | 'rarely-used-account';

export interface AnomalyFinding {
  readonly type: AnomalyType;
  readonly severity: AnomalySeverity;
  readonly description: string;
  readonly affectedJeIds: ReadonlyArray<string>;
  readonly score: number;
}

export interface JournalEntryRecord {
  readonly id: string;
  readonly entryNumber: string;
  readonly date: string;
  readonly postedAt: string;
  readonly totalDebit: bigint;
  readonly totalCredit: bigint;
  readonly status: 'draft' | 'posted' | 'voided';
  readonly description?: string | undefined;
  readonly createdBy: string;
  readonly lines: ReadonlyArray<{
    readonly accountId: string;
    readonly accountCode: string;
    readonly debitSatang: bigint;
    readonly creditSatang: bigint;
  }>;
}

export interface AnomalyScanInput {
  readonly period: string; // YYYY-MM
  readonly journalEntries: ReadonlyArray<JournalEntryRecord>;
  /** Historical account usage counts for rarely-used detection */
  readonly accountUsageCounts?: ReadonlyMap<string, number>;
}

export interface AnomalyScanOutput {
  readonly period: string;
  readonly totalEntriesScanned: number;
  readonly findings: ReadonlyArray<AnomalyFinding>;
  readonly summary: {
    readonly highCount: number;
    readonly mediumCount: number;
    readonly lowCount: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Amounts above this threshold (in satang) flagged as round-number suspicious */
const ROUND_NUMBER_THRESHOLD = 100_000_00n; // 100,000 THB in satang

/** Hour range considered "normal" (06:00 - 22:00) */
const NORMAL_HOUR_START = 6;
const NORMAL_HOUR_END = 22;

/** Account usage below this count (in the period) is considered rarely-used */
const RARELY_USED_THRESHOLD = 2;

// ---------------------------------------------------------------------------
// AnomalyDetectionAgent
// ---------------------------------------------------------------------------

export class AnomalyDetectionAgent extends BaseAgent<
  AnomalyScanInput,
  AnomalyScanOutput
> {
  constructor(config?: { agentId?: string; timeoutMs?: number }) {
    super({
      agentId: config?.agentId ?? 'anomaly-detection-agent',
      timeoutMs: config?.timeoutMs ?? 30_000,
    });
  }

  protected async executeCore(
    input: AnomalyScanInput,
    context: AgentContext,
    trace: AgentTrace,
  ): Promise<AgentResult<AnomalyScanOutput>> {
    const startMs = Date.now();

    trace.addStep('reasoning', 'Anomaly detection: validating input', {
      period: input.period,
      entryCount: input.journalEntries.length,
      tenantId: context.tenantId,
    });

    if (input.journalEntries.length === 0) {
      const emptyOutput: AnomalyScanOutput = {
        period: input.period,
        totalEntriesScanned: 0,
        findings: [],
        summary: { highCount: 0, mediumCount: 0, lowCount: 0 },
      };
      trace.addStep('final-answer', 'No journal entries to scan — returning empty result');
      return this.buildSuccess(emptyOutput, 1.0, trace, startMs);
    }

    const postedEntries = input.journalEntries.filter(
      (je) => je.status === 'posted',
    );

    const findings: AnomalyFinding[] = [];

    // Check 1: Duplicate amounts on same day
    findings.push(...this.detectDuplicateAmounts(postedEntries, trace));

    // Check 2: Unusual hours posting
    findings.push(...this.detectUnusualHours(postedEntries, trace));

    // Check 3: Round-number amounts over threshold
    findings.push(...this.detectRoundNumbers(postedEntries, trace));

    // Check 4: Unusual account combinations
    findings.push(...this.detectUnusualAccountCombos(postedEntries, trace));

    // Check 5: Rarely-used accounts
    findings.push(
      ...this.detectRarelyUsedAccounts(postedEntries, input.accountUsageCounts, trace),
    );

    // Sort by severity
    const severityOrder: Record<AnomalySeverity, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const summary = {
      highCount: findings.filter((f) => f.severity === 'high').length,
      mediumCount: findings.filter((f) => f.severity === 'medium').length,
      lowCount: findings.filter((f) => f.severity === 'low').length,
    };

    trace.addStep('final-answer', 'Anomaly scan complete', {
      totalFindings: findings.length,
      ...summary,
    });

    const output: AnomalyScanOutput = {
      period: input.period,
      totalEntriesScanned: postedEntries.length,
      findings,
      summary,
    };

    // Confidence: high if no findings, lower with more anomalies
    const confidence = findings.length === 0
      ? 0.95
      : Math.max(0.3, 0.9 - (summary.highCount * 0.15 + summary.mediumCount * 0.05 + summary.lowCount * 0.02));

    return this.buildSuccess(output, confidence, trace, startMs);
  }

  // ---------------------------------------------------------------------------
  // Detection methods
  // ---------------------------------------------------------------------------

  private detectDuplicateAmounts(
    entries: ReadonlyArray<JournalEntryRecord>,
    trace: AgentTrace,
  ): AnomalyFinding[] {
    const findings: AnomalyFinding[] = [];
    const byDateAmount = new Map<string, JournalEntryRecord[]>();

    for (const je of entries) {
      const key = `${je.date}|${je.totalDebit.toString()}`;
      const group = byDateAmount.get(key) ?? [];
      group.push(je);
      byDateAmount.set(key, group);
    }

    for (const [key, group] of byDateAmount) {
      if (group.length >= 2) {
        const [date] = key.split('|');
        findings.push({
          type: 'duplicate-amount',
          severity: group.length >= 3 ? 'high' : 'medium',
          description: `${group.length} journal entries with identical amount posted on ${date!}`,
          affectedJeIds: group.map((je) => je.id),
          score: Math.min(1, group.length * 0.3),
        });
      }
    }

    trace.addStep('reasoning', `Duplicate amount check: ${findings.length} groups found`);
    return findings;
  }

  private detectUnusualHours(
    entries: ReadonlyArray<JournalEntryRecord>,
    trace: AgentTrace,
  ): AnomalyFinding[] {
    const findings: AnomalyFinding[] = [];

    for (const je of entries) {
      if (!je.postedAt) continue;
      const hour = new Date(je.postedAt).getHours();
      if (hour < NORMAL_HOUR_START || hour >= NORMAL_HOUR_END) {
        findings.push({
          type: 'unusual-hours',
          severity: 'low',
          description: `Entry ${je.entryNumber} posted at unusual hour (${hour}:00)`,
          affectedJeIds: [je.id],
          score: 0.3,
        });
      }
    }

    trace.addStep('reasoning', `Unusual hours check: ${findings.length} entries found`);
    return findings;
  }

  private detectRoundNumbers(
    entries: ReadonlyArray<JournalEntryRecord>,
    trace: AgentTrace,
  ): AnomalyFinding[] {
    const findings: AnomalyFinding[] = [];

    for (const je of entries) {
      if (je.totalDebit >= ROUND_NUMBER_THRESHOLD) {
        // Check if amount is a round number (divisible by 100,000 satang = 1,000 THB)
        if (je.totalDebit % 100_000n === 0n) {
          findings.push({
            type: 'round-number',
            severity: je.totalDebit >= ROUND_NUMBER_THRESHOLD * 10n ? 'high' : 'medium',
            description: `Entry ${je.entryNumber} has round-number amount: ${je.totalDebit.toString()} satang`,
            affectedJeIds: [je.id],
            score: 0.4,
          });
        }
      }
    }

    trace.addStep('reasoning', `Round number check: ${findings.length} entries found`);
    return findings;
  }

  private detectUnusualAccountCombos(
    entries: ReadonlyArray<JournalEntryRecord>,
    trace: AgentTrace,
  ): AnomalyFinding[] {
    const findings: AnomalyFinding[] = [];
    const comboCount = new Map<string, number>();

    // Build frequency map of account combinations
    for (const je of entries) {
      const accounts = je.lines.map((l) => l.accountCode).sort().join('|');
      comboCount.set(accounts, (comboCount.get(accounts) ?? 0) + 1);
    }

    // Flag entries whose account combo appears only once (unique combo)
    for (const je of entries) {
      const accounts = je.lines.map((l) => l.accountCode).sort().join('|');
      const count = comboCount.get(accounts) ?? 0;
      if (count === 1 && je.lines.length >= 2) {
        findings.push({
          type: 'unusual-account-combo',
          severity: 'low',
          description: `Entry ${je.entryNumber} uses a unique account combination not seen elsewhere in the period`,
          affectedJeIds: [je.id],
          score: 0.25,
        });
      }
    }

    trace.addStep('reasoning', `Unusual account combo check: ${findings.length} entries found`);
    return findings;
  }

  private detectRarelyUsedAccounts(
    entries: ReadonlyArray<JournalEntryRecord>,
    historicalCounts: ReadonlyMap<string, number> | undefined,
    trace: AgentTrace,
  ): AnomalyFinding[] {
    const findings: AnomalyFinding[] = [];

    // Build period usage counts if no historical data
    const periodCounts = new Map<string, number>();
    for (const je of entries) {
      for (const line of je.lines) {
        periodCounts.set(line.accountCode, (periodCounts.get(line.accountCode) ?? 0) + 1);
      }
    }

    const usageCounts = historicalCounts ?? periodCounts;

    for (const je of entries) {
      for (const line of je.lines) {
        const count = usageCounts.get(line.accountCode) ?? 0;
        if (count <= RARELY_USED_THRESHOLD) {
          findings.push({
            type: 'rarely-used-account',
            severity: 'medium',
            description: `Entry ${je.entryNumber} posts to rarely-used account ${line.accountCode} (used ${count} time(s))`,
            affectedJeIds: [je.id],
            score: 0.35,
          });
          break; // One finding per JE
        }
      }
    }

    trace.addStep('reasoning', `Rarely-used account check: ${findings.length} entries found`);
    return findings;
  }
}
