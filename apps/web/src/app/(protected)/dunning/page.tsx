'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Mail, Clock } from 'lucide-react';

import { cn } from '@/lib/cn';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/components/domain/money-display';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DunningEntry {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  invoiceId: string;
  outstandingSatang: string;
  dueDate: string;
  daysOverdue: number;
  dunningLevel: number;
  lastDunnedAt: string | null;
  status: 'pending' | 'sent' | 'escalated';
}

interface DunningListResponse {
  items: DunningEntry[];
  total: number;
  summary: {
    totalOverdueSatang: string;
    countLevel1: number;
    countLevel2: number;
    countLevel3: number;
  };
}

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Sent', value: 'sent' },
  { label: 'Escalated', value: 'escalated' },
];

function levelColor(level: number): string {
  if (level >= 3) return 'bg-red-100 text-red-800';
  if (level === 2) return 'bg-orange-100 text-orange-800';
  return 'bg-yellow-100 text-yellow-800';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DunningPage(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [sendTarget, setSendTarget] = useState<DunningEntry | null>(null);
  const [sending, setSending] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<DunningListResponse>('/dunning', params);
  const entries = data?.items ?? [];

  const handleSendDunning = useCallback(async () => {
    if (!sendTarget) return;
    setSending(true);
    try {
      await api.post(`/dunning/${sendTarget.id}/send`);
      showToast.success(`Dunning notice sent for invoice ${sendTarget.invoiceNumber}`);
      setSendTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to send dunning notice');
    } finally {
      setSending(false);
    }
  }, [sendTarget, refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Dunning Dashboard</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Manage overdue invoice follow-ups and escalation
        </p>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Total Overdue</p>
            <MoneyDisplay amount={BigInt(data.summary.totalOverdueSatang)} size="lg" />
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">Level 1 (Reminder)</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{data.summary.countLevel1}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Level 2 (Warning)</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{data.summary.countLevel2}</p>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-red-700">Level 3 (Final)</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{data.summary.countLevel3}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer or invoice..."
        statusOptions={STATUS_OPTIONS}
        statusValue={status}
        onStatusChange={setStatus}
        resultCount={data?.total}
      />

      {/* Table */}
      {loading ? (
        <SkeletonRow count={5} />
      ) : entries.length === 0 ? (
        <EmptyState context="invoice-list" message="No dunning cases" description="No overdue invoices found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Days Overdue</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Last Dunned</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium">{entry.customerName}</td>
                  <td className="px-4 py-3 font-mono-figures">{entry.invoiceNumber}</td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={BigInt(entry.outstandingSatang)} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-overdue)] font-medium">
                    {new Date(entry.dueDate).toLocaleDateString('th-TH')}
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-right font-mono-figures font-medium',
                    entry.daysOverdue > 90 ? 'text-red-600' : entry.daysOverdue > 30 ? 'text-orange-600' : 'text-yellow-600',
                  )}>
                    {entry.daysOverdue}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', levelColor(entry.dunningLevel))}>
                      <AlertTriangle className="h-3 w-3" />
                      Level {entry.dunningLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                    {entry.lastDunnedAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.lastDunnedAt).toLocaleDateString('th-TH')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => setSendTarget(entry)}>
                      <Mail className="h-3.5 w-3.5" />
                      Send Notice
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Confirm */}
      <ConfirmDialog
        open={sendTarget !== null}
        onOpenChange={(open) => { if (!open) setSendTarget(null); }}
        title="Send Dunning Notice"
        description={`Send a Level ${sendTarget?.dunningLevel ?? ''} dunning notice to ${sendTarget?.customerName ?? ''} for invoice ${sendTarget?.invoiceNumber ?? ''}?`}
        confirmLabel="Send Notice"
        confirmVariant="primary"
        onConfirm={handleSendDunning}
        loading={sending}
      />
    </div>
  );
}
