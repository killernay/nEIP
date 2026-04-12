'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  source: string;
}

interface CurrencyListResponse { items: Currency[]; total: number; }
interface RateListResponse { items: ExchangeRate[]; total: number; }

export default function CurrenciesPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [activeTab, setActiveTab] = useState<'currencies' | 'rates'>('currencies');

  const { data: currencies, isLoading: loadingCurrencies } = useQuery<CurrencyListResponse>({
    queryKey: [tenantId, 'currencies'],
    queryFn: () => api.get<CurrencyListResponse>('/settings/currencies'),
  });

  const { data: rates, isLoading: loadingRates, refetch: refetchRates } = useQuery<RateListResponse>({
    queryKey: [tenantId, 'exchange-rates'],
    queryFn: () => api.get<RateListResponse>('/settings/exchange-rates'),
    enabled: activeTab === 'rates',
  });

  const handleSyncRates = useCallback(async () => {
    try {
      await api.post('/settings/exchange-rates/sync');
      showToast.success('Exchange rates synced');
      refetchRates();
    } catch {
      showToast.error('Failed to sync rates');
    }
  }, [refetchRates]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Currency Management</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Currencies and exchange rates</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('currencies')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'currencies'
              ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
              : 'border-transparent text-[var(--color-muted-foreground)]'
          }`}
        >
          Currencies
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'rates'
              ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
              : 'border-transparent text-[var(--color-muted-foreground)]'
          }`}
        >
          Exchange Rates
        </button>
      </div>

      {activeTab === 'currencies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => showToast.info('Add Currency — coming soon')}><Plus className="h-4 w-4" />Add Currency</Button>
          </div>
          {loadingCurrencies ? (
            <SkeletonRow count={5} />
          ) : (currencies?.items ?? []).length === 0 ? (
            <EmptyState context="search-results" message="No currencies configured" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Name</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Symbol</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Base</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {(currencies?.items ?? []).map((c) => (
                    <tr key={c.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                      <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                      <td className="px-4 py-3">{c.name}</td>
                      <td className="px-4 py-3 text-center">{c.symbol}</td>
                      <td className="px-4 py-3 text-center">{c.isBase ? 'Yes' : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rates' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleSyncRates}>
              <RefreshCw className="h-4 w-4" />Sync Rates
            </Button>
            <Button variant="primary"><Plus className="h-4 w-4" />Add Rate</Button>
          </div>
          {loadingRates ? (
            <SkeletonRow count={5} />
          ) : (rates?.items ?? []).length === 0 ? (
            <EmptyState context="search-results" message="No exchange rates configured" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">From</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">To</th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Rate</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Effective Date</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {(rates?.items ?? []).map((r) => (
                    <tr key={r.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                      <td className="px-4 py-3 font-mono">{r.fromCurrency}</td>
                      <td className="px-4 py-3 font-mono">{r.toCurrency}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.rate.toFixed(4)}</td>
                      <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                        {new Date(r.effectiveDate).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted-foreground)] capitalize">{r.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
