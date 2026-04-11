'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/components/domain/money-display';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface ForecastPoint {
  date: string;
  predictedSatang: number;
  lowerBoundSatang: number;
  upperBoundSatang: number;
  actualSatang: number | null;
}

interface ForecastData {
  horizonDays: number;
  points: ForecastPoint[];
  confidenceLevel: number;
  modelAccuracy: number;
  lastTrainedAt: string;
}

export default function ForecastPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [horizon, setHorizon] = useState('30');

  const { data, isLoading, refetch } = useQuery<ForecastData>({
    queryKey: [tenantId, 'ai', 'forecast', horizon],
    queryFn: () => api.get<ForecastData>('/ai/forecast/cash-flow', { horizonDays: horizon }),
  });

  const handleRetrain = useCallback(async () => {
    try {
      await api.post('/ai/forecast/retrain');
      showToast.success('Model retrained successfully');
      refetch();
    } catch {
      showToast.error('Retraining failed');
    }
  }, [refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-blue-500" />
          <div>
            <h1 className="text-2xl font-semibold">Cash Flow Forecast</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">AI-powered cash flow predictions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
            <option value="90">90 Days</option>
          </select>
          <Button variant="outline" onClick={handleRetrain}><RefreshCw className="h-4 w-4" />Retrain</Button>
        </div>
      </div>

      {/* Model Info */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">Model Accuracy</p>
            <p className="mt-1 text-2xl font-bold text-blue-500">{data.modelAccuracy}%</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">Confidence Level</p>
            <p className="mt-1 text-2xl font-bold">{data.confidenceLevel}%</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">Last Trained</p>
            <p className="mt-1 text-sm font-medium">
              {new Date(data.lastTrainedAt).toLocaleDateString('th-TH')}
            </p>
          </div>
        </div>
      )}

      {/* Forecast Chart (table-based) */}
      {isLoading ? (
        <SkeletonRow count={10} />
      ) : data ? (
        <div>
          {/* Visual bar chart */}
          <div className="mb-4 space-y-1">
            {data.points.map((point) => {
              const maxAmount = Math.max(...data.points.map((p) => p.upperBoundSatang));
              const widthPct = maxAmount > 0 ? (point.predictedSatang / maxAmount) * 100 : 0;
              return (
                <div key={point.date} className="flex items-center gap-2">
                  <span className="w-20 text-right text-xs text-[var(--color-muted-foreground)]">
                    {new Date(point.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="relative flex-1 h-5">
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-blue-200 dark:bg-blue-900/40"
                      style={{ width: `${maxAmount > 0 ? (point.upperBoundSatang / maxAmount) * 100 : 0}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded bg-blue-500"
                      style={{ width: `${widthPct}%` }}
                    />
                    {point.actualSatang != null && (
                      <div
                        className="absolute top-0 h-5 w-0.5 bg-green-500"
                        style={{ left: `${maxAmount > 0 ? (point.actualSatang / maxAmount) * 100 : 0}%` }}
                      />
                    )}
                  </div>
                  <span className="w-28 text-right text-xs">
                    <MoneyDisplay amount={BigInt(point.predictedSatang)} size="sm" />
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-[var(--color-muted-foreground)]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-blue-500" />Predicted
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-blue-200" />Confidence Range
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-0.5 bg-green-500" />Actual
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
