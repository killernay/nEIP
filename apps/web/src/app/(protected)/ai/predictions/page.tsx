'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/components/domain/money-display';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface PredictionMetric {
  label: string;
  currentValue: number;
  predictedValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}

interface RevenueForecast {
  month: string;
  predictedSatang: number;
  lowerBoundSatang: number;
  upperBoundSatang: number;
}

interface PredictionsData {
  metrics: PredictionMetric[];
  revenueForecast: RevenueForecast[];
  churnRisk: { customerId: string; customerName: string; riskPercent: number; lastActivity: string }[];
}

export default function PredictionsPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'churn'>('overview');

  const { data, isLoading } = useQuery<PredictionsData>({
    queryKey: [tenantId, 'ai', 'predictions'],
    queryFn: () => api.get<PredictionsData>('/ai/predictions'),
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-purple-500" />
        <div>
          <h1 className="text-2xl font-semibold">Predictive Analytics</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">AI-driven business predictions and trend analysis</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {(['overview', 'revenue', 'churn'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
              activeTab === tab
                ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
                : 'border-transparent text-[var(--color-muted-foreground)]'
            }`}
          >
            {tab === 'churn' ? 'Churn Risk' : tab === 'revenue' ? 'Revenue Forecast' : 'Overview'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard count={4} />
        </div>
      ) : data && (
        <>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-[var(--color-border)] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--color-muted-foreground)]">{metric.label}</p>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : metric.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{metric.predictedValue.toLocaleString()}</span>
                    <span className={`text-sm font-medium ${
                      metric.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.changePercent >= 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                    <span>Current: {metric.currentValue.toLocaleString()}</span>
                    <span className="ml-auto">Confidence: {metric.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-4">
              <div className="space-y-1">
                {data.revenueForecast.map((f) => {
                  const maxAmount = Math.max(...data.revenueForecast.map((x) => x.upperBoundSatang));
                  const widthPct = maxAmount > 0 ? (f.predictedSatang / maxAmount) * 100 : 0;
                  return (
                    <div key={f.month} className="flex items-center gap-2">
                      <span className="w-16 text-right text-xs text-[var(--color-muted-foreground)]">{f.month}</span>
                      <div className="relative flex-1 h-6">
                        <div
                          className="absolute inset-y-0 left-0 rounded bg-purple-200 dark:bg-purple-900/40"
                          style={{ width: `${maxAmount > 0 ? (f.upperBoundSatang / maxAmount) * 100 : 0}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 rounded bg-purple-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span className="w-28 text-right text-xs">
                        <MoneyDisplay amount={BigInt(f.predictedSatang)} size="sm" />
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-xs text-[var(--color-muted-foreground)]">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-purple-500" />Predicted
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-purple-200" />Range
                </span>
              </div>
            </div>
          )}

          {activeTab === 'churn' && (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Customer</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Churn Risk</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.churnRisk.map((c) => (
                    <tr key={c.customerId} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                      <td className="px-4 py-3 font-medium">{c.customerName}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className={`h-2 rounded-full ${
                                c.riskPercent >= 80 ? 'bg-red-500' :
                                c.riskPercent >= 50 ? 'bg-amber-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${c.riskPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{c.riskPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                        {new Date(c.lastActivity).toLocaleDateString('th-TH')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
