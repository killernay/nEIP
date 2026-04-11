'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  description: string | null;
}

interface LeaveAccrualConfig {
  id: string;
  leaveType: string;
  accrualRate: number;
  accrualPeriod: string;
  maxBalance: number;
  carryOverLimit: number;
}

interface HolidayListResponse { items: PublicHoliday[]; total: number; }
interface AccrualListResponse { items: LeaveAccrualConfig[]; total: number; }

export default function LeaveCalendarPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [activeTab, setActiveTab] = useState<'holidays' | 'accrual'>('holidays');
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: holidays, isLoading: loadingHolidays, refetch: refetchHolidays } = useQuery<HolidayListResponse>({
    queryKey: [tenantId, 'public-holidays', year],
    queryFn: () => api.get<HolidayListResponse>('/settings/public-holidays', { year: String(year) }),
  });

  const { data: accruals, isLoading: loadingAccruals } = useQuery<AccrualListResponse>({
    queryKey: [tenantId, 'leave-accrual-config'],
    queryFn: () => api.get<AccrualListResponse>('/settings/leave-accrual-config'),
  });

  const handleDeleteHoliday = useCallback(async (id: string) => {
    try {
      await api.delete(`/settings/public-holidays/${id}`);
      showToast.success('Holiday removed');
      refetchHolidays();
    } catch {
      showToast.error('Failed to remove holiday');
    }
  }, [refetchHolidays]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leave Calendar Settings</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Public holidays and leave accrual configuration</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'holidays'
              ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
              : 'border-transparent text-[var(--color-muted-foreground)]'
          }`}
        >
          <Calendar className="mr-1 inline h-4 w-4" />Public Holidays
        </button>
        <button
          onClick={() => setActiveTab('accrual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'accrual'
              ? 'border-[var(--color-primary)] text-[var(--color-foreground)]'
              : 'border-transparent text-[var(--color-muted-foreground)]'
          }`}
        >
          Leave Accrual Rules
        </button>
      </div>

      {activeTab === 'holidays' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm">Year:</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {[year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <Button variant="primary"><Plus className="h-4 w-4" />Add Holiday</Button>
          </div>

          {loadingHolidays ? (
            <SkeletonRow count={5} />
          ) : (holidays?.items ?? []).length === 0 ? (
            <EmptyState context="search-results" message="No holidays configured for this year" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Holiday Name</th>
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Description</th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(holidays?.items ?? []).map((h) => (
                    <tr key={h.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                      <td className="px-4 py-3 font-mono text-xs">{new Date(h.date).toLocaleDateString('th-TH')}</td>
                      <td className="px-4 py-3 font-medium">{h.name}</td>
                      <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{h.description ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteHoliday(h.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'accrual' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary"><Plus className="h-4 w-4" />Add Rule</Button>
          </div>

          {loadingAccruals ? (
            <SkeletonRow count={3} />
          ) : (accruals?.items ?? []).length === 0 ? (
            <EmptyState context="search-results" message="No accrual rules configured" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                    <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Leave Type</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Rate</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Period</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Max Balance</th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Carry Over Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {(accruals?.items ?? []).map((rule) => (
                    <tr key={rule.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                      <td className="px-4 py-3 font-medium capitalize">{rule.leaveType.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-center">{rule.accrualRate} days</td>
                      <td className="px-4 py-3 text-center capitalize">{rule.accrualPeriod}</td>
                      <td className="px-4 py-3 text-center">{rule.maxBalance} days</td>
                      <td className="px-4 py-3 text-center">{rule.carryOverLimit} days</td>
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
