/**
 * PredictiveAgent — AI agent for revenue/expense forecasting.
 *
 * Implements Story 6.8: simple statistical forecasting using linear regression
 * for revenue and moving averages for expenses. No external ML library needed.
 *
 * Architecture references: AR11, FR17-FR23
 * Story: 6.8
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

export type PredictionType = 'revenue' | 'expense';

export interface HistoricalDataPoint {
  readonly period: string; // YYYY-MM
  readonly amountSatang: bigint;
  readonly category?: string;
}

export interface ForecastPoint {
  readonly period: string;
  readonly forecastedAmount: string; // satang string
  readonly lowerBound: string;
  readonly upperBound: string;
}

export interface TrendLine {
  readonly slope: number; // monthly change in satang
  readonly intercept: number;
  readonly rSquared: number; // goodness of fit 0-1
}

export interface PredictiveInput {
  readonly type: PredictionType;
  readonly historicalData: ReadonlyArray<HistoricalDataPoint>;
  readonly forecastMonths: number;
  readonly category?: string; // for expense category filtering
}

export interface PredictiveOutput {
  readonly type: PredictionType;
  readonly historical: ReadonlyArray<{ period: string; amount: string }>;
  readonly trendLine: TrendLine;
  readonly forecast: ReadonlyArray<ForecastPoint>;
  readonly movingAverage: ReadonlyArray<{ period: string; amount: string }>;
}

// ---------------------------------------------------------------------------
// PredictiveAgent
// ---------------------------------------------------------------------------

export class PredictiveAgent extends BaseAgent<
  PredictiveInput,
  PredictiveOutput
> {
  constructor(config?: { agentId?: string; timeoutMs?: number }) {
    super({
      agentId: config?.agentId ?? 'predictive-agent',
      timeoutMs: config?.timeoutMs ?? 15_000,
    });
  }

  protected async executeCore(
    input: PredictiveInput,
    context: AgentContext,
    trace: AgentTrace,
  ): Promise<AgentResult<PredictiveOutput>> {
    const startMs = Date.now();

    trace.addStep('reasoning', 'Predictive analysis: validating input', {
      type: input.type,
      dataPoints: input.historicalData.length,
      forecastMonths: input.forecastMonths,
      tenantId: context.tenantId,
    });

    if (input.historicalData.length < 3) {
      return this.buildFailure(
        new ValidationError({
          detail: `Need at least 3 historical data points for prediction, received: ${input.historicalData.length}`,
        }),
        trace,
        startMs,
      );
    }

    if (input.forecastMonths < 1 || input.forecastMonths > 24) {
      return this.buildFailure(
        new ValidationError({
          detail: `Forecast months must be 1-24, received: ${input.forecastMonths}`,
        }),
        trace,
        startMs,
      );
    }

    // Sort data chronologically
    const sorted = [...input.historicalData].sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    // Convert to numeric arrays for regression
    const values = sorted.map((d) => Number(d.amountSatang));
    const indices = sorted.map((_, i) => i);

    // Compute linear regression
    const trendLine = this.linearRegression(indices, values);
    trace.addStep('reasoning', 'Linear regression computed', {
      slope: trendLine.slope,
      rSquared: trendLine.rSquared,
    });

    // Compute 3-period moving average
    const movingAvg = this.movingAverage(sorted, 3);
    trace.addStep('reasoning', `Moving average computed (${movingAvg.length} periods)`);

    // Generate forecast
    const n = sorted.length;
    const lastPeriod = sorted[n - 1]!.period;
    const forecast: ForecastPoint[] = [];

    // Confidence band width based on residual standard error
    const residuals = values.map((v, i) => v - (trendLine.slope * i + trendLine.intercept));
    const residualStdDev = Math.sqrt(
      residuals.reduce((sum, r) => sum + r * r, 0) / Math.max(1, residuals.length - 2),
    );

    for (let m = 1; m <= input.forecastMonths; m++) {
      const forecastIdx = n - 1 + m;
      const forecasted = Math.max(0, trendLine.slope * forecastIdx + trendLine.intercept);
      const band = residualStdDev * 1.96 * Math.sqrt(1 + m / n);

      forecast.push({
        period: this.addMonths(lastPeriod, m),
        forecastedAmount: String(Math.round(forecasted)),
        lowerBound: String(Math.round(Math.max(0, forecasted - band))),
        upperBound: String(Math.round(forecasted + band)),
      });
    }

    trace.addStep('final-answer', 'Forecast generated', {
      forecastMonths: input.forecastMonths,
      trendDirection: trendLine.slope > 0 ? 'increasing' : trendLine.slope < 0 ? 'decreasing' : 'flat',
    });

    const output: PredictiveOutput = {
      type: input.type,
      historical: sorted.map((d) => ({
        period: d.period,
        amount: d.amountSatang.toString(),
      })),
      trendLine,
      forecast,
      movingAverage: movingAvg,
    };

    // Confidence based on R² and data count
    const dataConfidence = Math.min(1, input.historicalData.length / 12);
    const fitConfidence = trendLine.rSquared;
    const confidence = Math.max(0.3, (dataConfidence * 0.4 + fitConfidence * 0.6) * 0.9);

    return this.buildSuccess(output, confidence, trace, startMs);
  }

  // ---------------------------------------------------------------------------
  // Statistical helpers
  // ---------------------------------------------------------------------------

  private linearRegression(x: number[], y: number[]): TrendLine {
    const n = x.length;
    if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i]!;
      sumY += y[i]!;
      sumXY += x[i]! * y[i]!;
      sumX2 += x[i]! * x[i]!;
      sumY2 += y[i]! * y[i]!;
    }

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R² calculation
    const meanY = sumY / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * x[i]! + intercept;
      ssRes += (y[i]! - predicted) ** 2;
      ssTot += (y[i]! - meanY) ** 2;
    }
    const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

    return {
      slope: Math.round(slope * 100) / 100,
      intercept: Math.round(intercept * 100) / 100,
      rSquared: Math.round(rSquared * 1000) / 1000,
    };
  }

  private movingAverage(
    data: ReadonlyArray<HistoricalDataPoint>,
    windowSize: number,
  ): Array<{ period: string; amount: string }> {
    const result: Array<{ period: string; amount: string }> = [];

    for (let i = windowSize - 1; i < data.length; i++) {
      let sum = 0n;
      for (let j = 0; j < windowSize; j++) {
        sum += data[i - j]!.amountSatang;
      }
      const avg = sum / BigInt(windowSize);
      result.push({
        period: data[i]!.period,
        amount: avg.toString(),
      });
    }

    return result;
  }

  private addMonths(period: string, months: number): string {
    const [yearStr, monthStr] = period.split('-') as [string, string];
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + months;

    while (month > 12) {
      month -= 12;
      year++;
    }
    while (month < 1) {
      month += 12;
      year--;
    }

    return `${year}-${String(month).padStart(2, '0')}`;
  }
}
