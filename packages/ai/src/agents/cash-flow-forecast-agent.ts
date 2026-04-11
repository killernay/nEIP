/**
 * CashFlowForecastAgent — AI agent for projecting future cash positions.
 *
 * Implements Story 6.2: deterministic forecast from AR aging (expected
 * receipts), AP aging (expected payments), and recurring JEs.
 *
 * For each day in the forecast window (30/60/90 days), projects:
 *   - Expected inflow (AR due dates)
 *   - Expected outflow (AP due dates + recurring expenses)
 *   - Projected balance (opening + cumulative net)
 *
 * Architecture references: AR11, FR17-FR23
 * Story: 6.2
 */

import { ValidationError } from '@neip/shared';

import type {
  AgentContext,
  AgentResult,
} from '../types/agent-types.js';
import { BaseAgent, AgentTrace } from './base-agent.js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface ArAgingItem {
  readonly invoiceId: string;
  readonly customerId: string;
  readonly amountDueSatang: bigint;
  readonly dueDate: string; // ISO 8601
}

export interface ApAgingItem {
  readonly billId: string;
  readonly vendorId: string;
  readonly amountDueSatang: bigint;
  readonly dueDate: string; // ISO 8601
}

export interface RecurringJeItem {
  readonly description: string;
  readonly amountSatang: bigint;
  readonly direction: 'inflow' | 'outflow';
  readonly frequencyDays: number;
  readonly nextOccurrence: string; // ISO 8601
}

export interface CashFlowForecastInput {
  readonly openingBalanceSatang: bigint;
  readonly forecastDays: number;
  readonly arAging: ReadonlyArray<ArAgingItem>;
  readonly apAging: ReadonlyArray<ApAgingItem>;
  readonly recurringJes: ReadonlyArray<RecurringJeItem>;
}

export interface DailyProjection {
  readonly date: string;
  readonly expectedInflow: string;  // satang string
  readonly expectedOutflow: string; // satang string
  readonly projectedBalance: string; // satang string
}

export interface CashFlowForecastOutput {
  readonly forecastDays: number;
  readonly openingBalance: string;
  readonly dailyProjections: ReadonlyArray<DailyProjection>;
  readonly summary: {
    readonly totalExpectedInflow: string;
    readonly totalExpectedOutflow: string;
    readonly closingBalance: string;
    readonly lowestBalance: string;
    readonly lowestBalanceDate: string;
  };
}

// ---------------------------------------------------------------------------
// CashFlowForecastAgent
// ---------------------------------------------------------------------------

export class CashFlowForecastAgent extends BaseAgent<
  CashFlowForecastInput,
  CashFlowForecastOutput
> {
  constructor(config?: { agentId?: string; timeoutMs?: number }) {
    super({
      agentId: config?.agentId ?? 'cash-flow-forecast-agent',
      timeoutMs: config?.timeoutMs ?? 30_000,
    });
  }

  protected async executeCore(
    input: CashFlowForecastInput,
    context: AgentContext,
    trace: AgentTrace,
  ): Promise<AgentResult<CashFlowForecastOutput>> {
    const startMs = Date.now();

    trace.addStep('reasoning', 'Cash flow forecast: validating input', {
      forecastDays: input.forecastDays,
      arItems: input.arAging.length,
      apItems: input.apAging.length,
      recurringJes: input.recurringJes.length,
      tenantId: context.tenantId,
    });

    if (input.forecastDays < 1 || input.forecastDays > 365) {
      return this.buildFailure(
        new ValidationError({
          detail: `Forecast days must be between 1 and 365, received: ${input.forecastDays}`,
        }),
        trace,
        startMs,
      );
    }

    // Build daily inflow/outflow maps
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyInflow = new Map<string, bigint>();
    const dailyOutflow = new Map<string, bigint>();

    // Map AR aging to expected inflows by due date
    for (const ar of input.arAging) {
      const dateKey = ar.dueDate.slice(0, 10);
      dailyInflow.set(dateKey, (dailyInflow.get(dateKey) ?? 0n) + ar.amountDueSatang);
    }

    trace.addStep('reasoning', `Mapped ${input.arAging.length} AR items to inflow dates`);

    // Map AP aging to expected outflows by due date
    for (const ap of input.apAging) {
      const dateKey = ap.dueDate.slice(0, 10);
      dailyOutflow.set(dateKey, (dailyOutflow.get(dateKey) ?? 0n) + ap.amountDueSatang);
    }

    trace.addStep('reasoning', `Mapped ${input.apAging.length} AP items to outflow dates`);

    // Map recurring JEs across the forecast window
    for (const rje of input.recurringJes) {
      let nextDate = new Date(rje.nextOccurrence);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + input.forecastDays);

      while (nextDate <= endDate) {
        const dateKey = nextDate.toISOString().slice(0, 10);
        if (rje.direction === 'inflow') {
          dailyInflow.set(dateKey, (dailyInflow.get(dateKey) ?? 0n) + rje.amountSatang);
        } else {
          dailyOutflow.set(dateKey, (dailyOutflow.get(dateKey) ?? 0n) + rje.amountSatang);
        }
        nextDate = new Date(nextDate);
        nextDate.setDate(nextDate.getDate() + rje.frequencyDays);
      }
    }

    trace.addStep('reasoning', 'Recurring JEs projected across forecast window');

    // Build daily projections
    const projections: DailyProjection[] = [];
    let runningBalance = input.openingBalanceSatang;
    let totalInflow = 0n;
    let totalOutflow = 0n;
    let lowestBalance = runningBalance;
    let lowestBalanceDate = today.toISOString().slice(0, 10);

    for (let d = 0; d < input.forecastDays; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dateKey = date.toISOString().slice(0, 10);

      const dayInflow = dailyInflow.get(dateKey) ?? 0n;
      const dayOutflow = dailyOutflow.get(dateKey) ?? 0n;

      runningBalance = runningBalance + dayInflow - dayOutflow;
      totalInflow += dayInflow;
      totalOutflow += dayOutflow;

      if (runningBalance < lowestBalance) {
        lowestBalance = runningBalance;
        lowestBalanceDate = dateKey;
      }

      projections.push({
        date: dateKey,
        expectedInflow: dayInflow.toString(),
        expectedOutflow: dayOutflow.toString(),
        projectedBalance: runningBalance.toString(),
      });
    }

    trace.addStep('final-answer', 'Cash flow forecast complete', {
      forecastDays: input.forecastDays,
      totalInflow: totalInflow.toString(),
      totalOutflow: totalOutflow.toString(),
      closingBalance: runningBalance.toString(),
    });

    const output: CashFlowForecastOutput = {
      forecastDays: input.forecastDays,
      openingBalance: input.openingBalanceSatang.toString(),
      dailyProjections: projections,
      summary: {
        totalExpectedInflow: totalInflow.toString(),
        totalExpectedOutflow: totalOutflow.toString(),
        closingBalance: runningBalance.toString(),
        lowestBalance: lowestBalance.toString(),
        lowestBalanceDate,
      },
    };

    // Confidence based on data quality
    const hasArData = input.arAging.length > 0;
    const hasApData = input.apAging.length > 0;
    const confidence = hasArData && hasApData ? 0.85 : hasArData || hasApData ? 0.65 : 0.4;

    return this.buildSuccess(output, confidence, trace, startMs);
  }
}
