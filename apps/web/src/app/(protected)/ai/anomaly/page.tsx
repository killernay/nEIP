'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, Eye, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MoneyDisplay } from '@/components/domain/money-display';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface Anomaly {
  id: string;
  documentType: string;
  documentNumber: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  amountSatang: number;
  detectedAt: string;
  status: string;
  reason: string;
}

interface AnomalyListResponse { items: Anomaly[]; total: number; }

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function AnomalyPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [scanning, setScanning] = useState(false);

  const { data, isLoading, refetch } = useQuery<AnomalyListResponse>({
    queryKey: [tenantId, 'ai', 'anomalies'],
    queryFn: () => api.get<AnomalyListResponse>('/ai/anomalies'),
  });

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      await api.post('/ai/anomalies/scan');
      showToast.success('Anomaly scan completed');
      refetch();
    } catch {
      showToast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  }, [refetch]);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await api.post(`/ai/anomalies/${id}/dismiss`);
      refetch();
    } catch {
      showToast.error('Failed to dismiss');
    }
  }, [refetch]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-2xl font-semibold">Anomaly Detection</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">AI-detected unusual transaction patterns</p>
          </div>
        </div>
        <Button variant="primary" onClick={handleScan} disabled={scanning}>
          <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Run Scan'}
        </Button>
      </div>

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No anomalies detected" description="All transactions look normal" />
      ) : (
        <div className="space-y-3">
          {items.map((anomaly) => (
            <div key={anomaly.id} className="rounded-lg border border-[var(--color-border)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase ${SEVERITY_BADGE[anomaly.severity]}`}>
                      {anomaly.severity}
                    </span>
                    <span className="font-mono text-sm">{anomaly.documentType} {anomaly.documentNumber}</span>
                  </div>
                  <p className="mt-1 text-sm">{anomaly.description}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Reason: {anomaly.reason}</p>
                </div>
                <div className="text-right">
                  <MoneyDisplay amount={BigInt(anomaly.amountSatang)} size="sm" />
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {new Date(anomaly.detectedAt).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-1">
                <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" />Investigate</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDismiss(anomaly.id)}>
                  <CheckCircle className="h-3.5 w-3.5" />Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
