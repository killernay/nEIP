'use client';

import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
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

interface DataSubjectRequest {
  id: string;
  requestNumber: string;
  subjectName: string;
  subjectEmail: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'objection';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  createdAt: string;
  dueDate: string;
  completedAt: string | null;
}

interface DSRListResponse {
  items: DataSubjectRequest[];
  total: number;
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  access: 'Access (ขอเข้าถึง)',
  rectification: 'Rectification (แก้ไข)',
  erasure: 'Erasure (ลบ)',
  portability: 'Portability (โอนย้าย)',
  objection: 'Objection (คัดค้าน)',
};

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PdpaPage(): React.JSX.Element {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [completeTarget, setCompleteTarget] = useState<DataSubjectRequest | null>(null);
  const [completing, setCompleting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<DSRListResponse>('/pdpa/requests', params);
  const requests = data?.items ?? [];

  const handleComplete = useCallback(async () => {
    if (!completeTarget) return;
    setCompleting(true);
    try {
      await api.patch(`/pdpa/requests/${completeTarget.id}`, { status: 'completed' });
      showToast.success(`Request ${completeTarget.requestNumber} marked as completed`);
      setCompleteTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to update request');
    } finally {
      setCompleting(false);
    }
  }, [completeTarget, refetch]);

  const statusBadge = (s: string): React.JSX.Element => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', colors[s] ?? 'bg-gray-100 text-gray-800')}>
        {s === 'pending' && <Clock className="h-3 w-3" />}
        {s === 'completed' && <CheckCircle className="h-3 w-3" />}
        {s.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} aria-label="Back to settings">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">PDPA Data Subject Requests</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Manage data subject access and processing requests (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or request number..."
        statusOptions={STATUS_OPTIONS}
        statusValue={status}
        onStatusChange={setStatus}
        resultCount={data?.total}
      />

      {/* Table */}
      {loading ? (
        <SkeletonRow count={5} />
      ) : requests.length === 0 ? (
        <EmptyState context="search-results" message="No PDPA requests" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Request #</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-mono-figures font-medium">{req.requestNumber}</td>
                  <td className="px-4 py-3">
                    <div>{req.subjectName}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">{req.subjectEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{REQUEST_TYPE_LABELS[req.requestType] ?? req.requestType}</td>
                  <td className="px-4 py-3">{statusBadge(req.status)}</td>
                  <td className={cn(
                    'px-4 py-3',
                    new Date(req.dueDate) < new Date() && req.status !== 'completed'
                      ? 'text-[var(--color-overdue)] font-medium'
                      : 'text-[var(--color-muted-foreground)]',
                  )}>
                    {new Date(req.dueDate).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {req.status !== 'completed' && req.status !== 'rejected' && (
                        <Button variant="ghost" size="sm" onClick={() => setCompleteTarget(req)}>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Complete
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

      {/* Complete Confirm */}
      <ConfirmDialog
        open={completeTarget !== null}
        onOpenChange={(open) => { if (!open) setCompleteTarget(null); }}
        title="Complete Request"
        description={`Mark request ${completeTarget?.requestNumber ?? ''} as completed? This indicates the data subject's request has been fulfilled.`}
        confirmLabel="Mark Complete"
        confirmVariant="primary"
        onConfirm={handleComplete}
        loading={completing}
      />
    </div>
  );
}
