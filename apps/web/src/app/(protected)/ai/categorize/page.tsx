'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tag, Zap, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MoneyDisplay } from '@/components/domain/money-display';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface UncategorizedItem {
  id: string;
  description: string;
  amountSatang: number;
  date: string;
  suggestedCategory: string;
  suggestedAccountId: string;
  suggestedAccountName: string;
  confidence: number;
  source: string;
}

interface CategorizeResponse { items: UncategorizedItem[]; total: number; }

export default function CategorizePage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [processing, setProcessing] = useState(false);

  const { data, isLoading, refetch } = useQuery<CategorizeResponse>({
    queryKey: [tenantId, 'ai', 'uncategorized'],
    queryFn: () => api.get<CategorizeResponse>('/ai/categorize/pending'),
  });

  const handleAutoCategorize = useCallback(async () => {
    setProcessing(true);
    try {
      const result = await api.post<{ categorized: number }>('/ai/categorize/auto');
      showToast.success(`Auto-categorized ${result.categorized} items`);
      refetch();
    } catch {
      showToast.error('Auto-categorization failed');
    } finally {
      setProcessing(false);
    }
  }, [refetch]);

  const handleAccept = useCallback(async (id: string) => {
    try {
      await api.post(`/ai/categorize/${id}/accept`);
      showToast.success('Category accepted');
      refetch();
    } catch {
      showToast.error('Failed to accept');
    }
  }, [refetch]);

  const handleReject = useCallback(async (id: string) => {
    try {
      await api.post(`/ai/categorize/${id}/reject`);
      refetch();
    } catch {
      showToast.error('Failed to reject');
    }
  }, [refetch]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-green-500" />
          <div>
            <h1 className="text-2xl font-semibold">Smart Categorization</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">AI-powered transaction categorization</p>
          </div>
        </div>
        <Button variant="primary" onClick={handleAutoCategorize} disabled={processing}>
          <Zap className="h-4 w-4" />{processing ? 'Processing...' : 'Auto-Categorize All'}
        </Button>
      </div>

      {/* Stats */}
      <div className="rounded-lg border border-[var(--color-border)] p-4">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {data?.total ?? 0} uncategorized transaction{(data?.total ?? 0) !== 1 ? 's' : ''} pending review
        </p>
      </div>

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="All caught up!" description="No uncategorized transactions" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Description</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Date</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Suggested Category</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Confidence</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">{item.source}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={BigInt(item.amountSatang)} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{item.date}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{item.suggestedCategory}</span>
                    <div className="text-xs text-[var(--color-muted-foreground)]">{item.suggestedAccountName}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.confidence >= 90 ? 'bg-green-100 text-green-700' :
                      item.confidence >= 70 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.confidence}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleAccept(item.id)}>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleReject(item.id)}>
                        <X className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
