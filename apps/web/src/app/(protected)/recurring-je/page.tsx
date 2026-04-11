'use client';

import { useCallback, useMemo, useState } from 'react';
import { Play, Plus, Pause, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecurringJETemplate {
  id: string;
  templateName: string;
  description: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  nextRunDate: string;
  lastRunDate: string | null;
  status: 'active' | 'paused' | 'completed';
  lineCount: number;
}

interface RecurringJEListResponse {
  items: RecurringJETemplate[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
];

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RecurringJEPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [runTarget, setRunTarget] = useState<RecurringJETemplate | null>(null);
  const [running, setRunning] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<RecurringJEListResponse>('/gl/recurring-journal-entries', params);
  const templates = data?.items ?? [];

  const handleRun = useCallback(async () => {
    if (!runTarget) return;
    setRunning(true);
    try {
      await api.post(`/gl/recurring-journal-entries/${runTarget.id}/run`);
      showToast.success(`Journal entry created from "${runTarget.templateName}"`);
      setRunTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to run recurring template');
    } finally {
      setRunning(false);
    }
  }, [runTarget, refetch]);

  const handleTogglePause = useCallback(async (template: RecurringJETemplate) => {
    const newStatus = template.status === 'active' ? 'paused' : 'active';
    try {
      await api.patch(`/gl/recurring-journal-entries/${template.id}`, { status: newStatus });
      showToast.success(`Template "${template.templateName}" ${newStatus === 'active' ? 'resumed' : 'paused'}`);
      refetch();
    } catch {
      showToast.error('Failed to update template');
    }
  }, [refetch]);

  const statusBadge = (s: string): React.JSX.Element => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', styles[s] ?? '')}>
        {s === 'active' && <CheckCircle className="h-3 w-3" />}
        {s === 'paused' && <Pause className="h-3 w-3" />}
        {s}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Recurring Journal Entries</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage templates for recurring journal entries (depreciation, accruals, etc.)
          </p>
        </div>
        <Link href="/recurring-je/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search templates..."
        statusOptions={STATUS_OPTIONS}
        statusValue={status}
        onStatusChange={setStatus}
        resultCount={data?.total}
      />

      {/* Table */}
      {loading ? (
        <SkeletonRow count={5} />
      ) : templates.length === 0 ? (
        <EmptyState
          context="search-results"
          message="No recurring JE templates"
          ctaLabel="Create Template"
          onCtaClick={() => router.push('/recurring-je/new')}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Template Name</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Next Run</th>
                <th className="px-4 py-3">Last Run</th>
                <th className="px-4 py-3 text-right">Lines</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{tpl.templateName}</div>
                    {tpl.description && (
                      <div className="text-xs text-[var(--color-muted-foreground)]">{tpl.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{FREQ_LABELS[tpl.frequency] ?? tpl.frequency}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {new Date(tpl.nextRunDate).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                    {tpl.lastRunDate ? new Date(tpl.lastRunDate).toLocaleDateString('th-TH') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-figures">{tpl.lineCount}</td>
                  <td className="px-4 py-3">{statusBadge(tpl.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {tpl.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => setRunTarget(tpl)}>
                          <Play className="h-3.5 w-3.5" />
                          Run Now
                        </Button>
                      )}
                      {tpl.status !== 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => handleTogglePause(tpl)}>
                          {tpl.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          {tpl.status === 'active' ? 'Pause' : 'Resume'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Run Confirm */}
      <ConfirmDialog
        open={runTarget !== null}
        onOpenChange={(open) => { if (!open) setRunTarget(null); }}
        title="Run Recurring Template"
        description={`This will create a new journal entry from template "${runTarget?.templateName ?? ''}". Proceed?`}
        confirmLabel="Run Now"
        confirmVariant="primary"
        onConfirm={handleRun}
        loading={running}
      />
    </div>
  );
}
