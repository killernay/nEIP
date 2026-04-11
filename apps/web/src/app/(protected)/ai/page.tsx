'use client';

import { useQuery } from '@tanstack/react-query';
import { Brain, AlertTriangle, TrendingUp, Tag, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface AIOverview {
  anomaliesDetected: number;
  forecastAccuracy: number;
  categorizedThisMonth: number;
  predictionsGenerated: number;
  lastRunAt: string;
}

const AI_TOOLS = [
  {
    title: 'Anomaly Detection',
    description: 'Scan transactions for unusual patterns and potential fraud',
    icon: AlertTriangle,
    href: '/ai/anomaly',
    color: 'text-amber-500',
  },
  {
    title: 'Cash Flow Forecast',
    description: 'AI-powered cash flow predictions based on historical data',
    icon: TrendingUp,
    href: '/ai/forecast',
    color: 'text-blue-500',
  },
  {
    title: 'Smart Categorization',
    description: 'Auto-categorize transactions using machine learning',
    icon: Tag,
    href: '/ai/categorize',
    color: 'text-green-500',
  },
  {
    title: 'Predictive Analytics',
    description: 'Revenue forecasts, churn predictions, and trend analysis',
    icon: BarChart3,
    href: '/ai/predictions',
    color: 'text-purple-500',
  },
];

export default function AIPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';

  const { data, isLoading } = useQuery<AIOverview>({
    queryKey: [tenantId, 'ai', 'overview'],
    queryFn: () => api.get<AIOverview>('/ai/overview'),
  });

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Brain className="h-7 w-7 text-[var(--color-primary)]" />
        <div>
          <h1 className="text-2xl font-semibold">AI Tools</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">AI-powered insights and automation</p>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard count={4} />
        </div>
      ) : data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">Anomalies Detected</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">{data.anomaliesDetected}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">Forecast Accuracy</p>
            <p className="mt-1 text-2xl font-bold text-blue-500">{data.forecastAccuracy}%</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">Categorized This Month</p>
            <p className="mt-1 text-2xl font-bold text-green-500">{data.categorizedThisMonth}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">Predictions Generated</p>
            <p className="mt-1 text-2xl font-bold text-purple-500">{data.predictionsGenerated}</p>
          </div>
        </div>
      )}

      {/* Tool Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {AI_TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <div className="group rounded-lg border border-[var(--color-border)] p-6 transition-all hover:border-[var(--color-primary)] hover:shadow-sm">
              <div className="flex items-center gap-3">
                <tool.icon className={`h-6 w-6 ${tool.color}`} />
                <h3 className="text-lg font-medium">{tool.title}</h3>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
