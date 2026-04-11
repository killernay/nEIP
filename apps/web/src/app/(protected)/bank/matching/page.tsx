'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Zap, Check, X, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MoneyDisplay } from '@/components/domain/money-display';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface MatchCandidate {
  id: string;
  bankTransactionId: string;
  bankDate: string;
  bankDescription: string;
  bankAmountSatang: number;
  matchedDocumentId: string | null;
  matchedDocumentNumber: string | null;
  matchedDocumentType: string | null;
  matchAmountSatang: number | null;
  confidence: number;
  status: string;
}

interface MatchingRule {
  id: string;
  name: string;
  pattern: string;
  accountId: string;
  accountName: string;
  isActive: boolean;
}

interface MatchListResponse { items: MatchCandidate[]; total: number; }
interface RuleListResponse { items: MatchingRule[]; total: number; }

export default function BankMatchingPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [activeTab, setActiveTab] = useState<'matching' | 'rules'>('matching');

  const { data: matches, isLoading: loadingMatches, refetch: refetchMatches } = useQuery<MatchListResponse>({
    queryKey: [tenantId, 'bank-matching'],
    queryFn: () => api.get<MatchListResponse>('/bank/matching/candidates'),
  });

  const { data: rules, isLoading: loadingRules } = useQuery<RuleListResponse>({
    queryKey: [tenantId, 'bank-matching-rules'],
    queryFn: () => api.get<RuleListResponse>('/bank/matching/rules'),
    enabled: activeTab === 'rules',
  });

  const handleAutoReconcile = useCallback(async () => {
    try {
      const result = await api.post<{ matched: number }>('/bank/matching/auto-reconcile');
      showToast.success(`Auto-reconciled ${result.matched} transactions`);
      refetchMatches();
    } catch {
      showToast.error('Auto-reconcile failed');
    }
  }, [refetchMatches]);

  const handleAcceptMatch = useCallback(async (id: string) => {
    try {
      await api.post(`/bank/matching/${id}/accept`);
      showToast.success('Match accepted');
      refetchMatches();
    } catch {
      showToast.error('Failed to accept match');
    }
  }, [refetchMatches]);

  const handleRejectMatch = useCallback(async (id: string) => {
    try {
      await api.post(`/bank/matching/${id}/reject`);
      refetchMatches();
    } catch {
      showToast.error('Failed to reject match');
    }
  }, [refetchMatches]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bank Matching</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Match bank transactions to documents</p>
        </div>
        <Button variant="primary" onClick={handleAutoReconcile}>
          <Zap className="h-4 w-4" />Auto-Reconcile
        </Button>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('matching')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'matching'
              ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
              : 'border-transparent text-[var(--color-muted-foreground)]'
          }`}
        >
          <Link2 className="mr-1 inline h-4 w-4" />Pending Matches
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'rules'
              ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
              : 'border-transparent text-[var(--color-muted-foreground)]'
          }`}
        >
          Matching Rules
        </button>
      </div>

      {activeTab === 'matching' && (
        loadingMatches ? (
          <SkeletonRow count={5} />
        ) : (matches?.items ?? []).length === 0 ? (
          <EmptyState context="search-results" message="No pending matches" description="All bank transactions have been reconciled" />
        ) : (
          <div className="space-y-3">
            {(matches?.items ?? []).map((m) => (
              <div key={m.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{m.bankDate}</span>
                      <span className="font-medium">{m.bankDescription}</span>
                    </div>
                    <div className="mt-1">
                      <MoneyDisplay amount={BigInt(m.bankAmountSatang)} size="sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.confidence > 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.confidence >= 90 ? 'bg-green-100 text-green-700' :
                        m.confidence >= 70 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {m.confidence}% match
                      </span>
                    )}
                  </div>
                </div>
                {m.matchedDocumentNumber && (
                  <div className="mt-2 flex items-center justify-between rounded bg-[var(--color-muted)]/30 px-3 py-2">
                    <div className="text-sm">
                      <span className="text-[var(--color-muted-foreground)]">Suggested:</span>{' '}
                      <span className="font-mono">{m.matchedDocumentType} {m.matchedDocumentNumber}</span>
                      {m.matchAmountSatang && (
                        <span className="ml-2"><MoneyDisplay amount={BigInt(m.matchAmountSatang)} size="sm" /></span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleAcceptMatch(m.id)}>
                        <Check className="h-3.5 w-3.5 text-green-600" />Accept
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRejectMatch(m.id)}>
                        <X className="h-3.5 w-3.5 text-red-600" />Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary"><Plus className="h-4 w-4" />Add Rule</Button>
          </div>
          {loadingRules ? (
            <SkeletonRow count={3} />
          ) : (rules?.items ?? []).length === 0 ? (
            <EmptyState context="search-results" message="No matching rules configured" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Rule Name</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Pattern</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Account</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {(rules?.items ?? []).map((rule) => (
                    <tr key={rule.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                      <td className="px-4 py-3 font-medium">{rule.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{rule.pattern}</td>
                      <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{rule.accountName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
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
    </div>
  );
}
