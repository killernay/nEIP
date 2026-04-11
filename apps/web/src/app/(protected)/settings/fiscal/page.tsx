'use client';

import { useCallback, useState } from 'react';
import { ArrowLeft, Calendar, Lock, Unlock } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';
import { api } from '@/lib/api-client';
import { useApi } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FiscalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
}

interface FiscalYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  periods: FiscalPeriod[];
}

interface FiscalListResponse {
  items: FiscalYear[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FiscalSettingsPage(): React.JSX.Element {
  const router = useRouter();
  const { data, loading, refetch } = useApi<FiscalListResponse>('/settings/fiscal-years');
  const fiscalYears = data?.items ?? [];

  // Toggle dialog
  const [toggleTarget, setToggleTarget] = useState<{ type: 'year' | 'period'; id: string; name: string; currentStatus: string } | null>(null);
  const [toggling, setToggling] = useState(false);

  // Year-end close dialog
  const [yearEndTarget, setYearEndTarget] = useState<FiscalYear | null>(null);
  const [yearEndClosing, setYearEndClosing] = useState(false);

  const handleToggle = useCallback(async () => {
    if (!toggleTarget) return;
    setToggling(true);
    const newStatus = toggleTarget.currentStatus === 'open' ? 'closed' : 'open';
    try {
      const endpoint = toggleTarget.type === 'year'
        ? `/settings/fiscal-years/${toggleTarget.id}`
        : `/settings/fiscal-periods/${toggleTarget.id}`;
      await api.patch(endpoint, { status: newStatus });
      showToast.success(`${toggleTarget.name} ${newStatus === 'open' ? 'opened' : 'closed'}`);
      setToggleTarget(null);
      refetch();
    } catch {
      showToast.error(`Failed to ${newStatus === 'open' ? 'open' : 'close'} ${toggleTarget.name}`);
    } finally {
      setToggling(false);
    }
  }, [toggleTarget, refetch]);

  const handleYearEndClose = useCallback(async () => {
    if (!yearEndTarget) return;
    setYearEndClosing(true);
    try {
      await api.post(`/settings/fiscal-years/${yearEndTarget.id}/year-end-close`);
      showToast.success(`Year-end close completed for Fiscal Year ${yearEndTarget.year}. Closing entries posted.`);
      setYearEndTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to perform year-end close');
    } finally {
      setYearEndClosing(false);
    }
  }, [yearEndTarget, refetch]);

  const statusBadge = (status: 'open' | 'closed'): React.JSX.Element => (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        status === 'open'
          ? 'bg-[var(--color-hitl-auto-bg)] text-[var(--color-hitl-auto-foreground)]'
          : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
      )}
    >
      {status === 'open' ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {status === 'open' ? 'Open' : 'Closed'}
    </span>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} aria-label="Back to settings">
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Fiscal Years & Periods</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage fiscal year definitions and period open/close status
          </p>
        </div>
      </div>

      {loading ? (
        <SkeletonRow count={4} />
      ) : fiscalYears.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-12 text-center text-sm text-[var(--color-muted-foreground)]">
          No fiscal years configured yet. Contact your administrator.
        </div>
      ) : (
        <div className="space-y-4">
          {fiscalYears.map((fy) => (
            <div
              key={fy.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]"
            >
              {/* Year header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
                  <div>
                    <span className="text-base font-semibold text-[var(--color-foreground)]">
                      Fiscal Year {fy.year}
                    </span>
                    <span className="ml-2 text-sm text-[var(--color-muted-foreground)]">
                      ({new Date(fy.startDate).toLocaleDateString('th-TH')} - {new Date(fy.endDate).toLocaleDateString('th-TH')})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(fy.status)}
                  {fy.status === 'open' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setYearEndTarget(fy)}
                    >
                      Year-End Close
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setToggleTarget({
                        type: 'year',
                        id: fy.id,
                        name: `Fiscal Year ${fy.year}`,
                        currentStatus: fy.status,
                      })
                    }
                  >
                    {fy.status === 'open' ? 'Close Year' : 'Reopen Year'}
                  </Button>
                </div>
              </div>

              {/* Periods */}
              <div className="border-t border-[var(--color-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      <th className="px-4 py-2 pl-12">Period</th>
                      <th className="px-4 py-2">Start</th>
                      <th className="px-4 py-2">End</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fy.periods.map((period) => (
                      <tr
                        key={period.id}
                        className="border-t border-[var(--color-border)] hover:bg-[var(--color-accent)]/30"
                      >
                        <td className="px-4 py-2 pl-12 font-medium">{period.name}</td>
                        <td className="px-4 py-2 text-[var(--color-muted-foreground)]">
                          {new Date(period.startDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-muted-foreground)]">
                          {new Date(period.endDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-4 py-2">{statusBadge(period.status)}</td>
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setToggleTarget({
                                type: 'period',
                                id: period.id,
                                name: period.name,
                                currentStatus: period.status,
                              })
                            }
                          >
                            {period.status === 'open' ? 'Close' : 'Open'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle Confirm */}
      <ConfirmDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => { if (!open) setToggleTarget(null); }}
        title={
          toggleTarget?.currentStatus === 'open'
            ? `Close ${toggleTarget.name}`
            : `Open ${toggleTarget?.name ?? ''}`
        }
        description={
          toggleTarget?.currentStatus === 'open'
            ? `Closing ${toggleTarget.name} will prevent new transactions from being posted to this period. Are you sure?`
            : `Reopening ${toggleTarget?.name ?? ''} will allow new transactions. Are you sure?`
        }
        confirmLabel={toggleTarget?.currentStatus === 'open' ? 'Close' : 'Open'}
        confirmVariant={toggleTarget?.currentStatus === 'open' ? 'destructive' : 'primary'}
        onConfirm={handleToggle}
        loading={toggling}
      />
      {/* Year-End Close Confirm */}
      <ConfirmDialog
        open={yearEndTarget !== null}
        onOpenChange={(open) => { if (!open) setYearEndTarget(null); }}
        title={`Year-End Close — Fiscal Year ${yearEndTarget?.year ?? ''}`}
        description="This will close all periods, post closing journal entries (revenue & expense to retained earnings), and lock the fiscal year. This action is difficult to reverse. Are you sure?"
        confirmLabel="Run Year-End Close"
        confirmVariant="destructive"
        onConfirm={handleYearEndClose}
        loading={yearEndClosing}
      />
    </div>
  );
}
