'use client';

import { useMemo, useState } from 'react';
import { Eye, Plus, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useApi } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MaintenanceOrder {
  id: string;
  orderNumber: string;
  equipmentName: string;
  equipmentCode: string;
  type: string;
  priority: string;
  assignee: string;
  scheduledDate: string;
  status: string;
}

interface MaintenanceResponse {
  items: MaintenanceOrder[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MaintenancePage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<MaintenanceResponse>('/maintenance/orders', params);
  const orders = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Plant Maintenance</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Equipment and maintenance order management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/maintenance/plans"><Button variant="ghost"><Wrench className="h-4 w-4" /> Plans</Button></Link>
          <Link href="/maintenance/new"><Button variant="primary"><Plus className="h-4 w-4" /> New Order</Button></Link>
        </div>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search equipment or orders..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : orders.length === 0 ? (
        <EmptyState context="search-results" message="No maintenance orders found" ctaLabel="Create Order" onCtaClick={() => router.push('/maintenance/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3">
                    <div>{o.equipmentName}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">{o.equipmentCode}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{o.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${o.priority === 'high' ? 'bg-red-100 text-red-800' : o.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                      {o.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{o.assignee}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(o.scheduledDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${o.status === 'completed' ? 'bg-green-100 text-green-800' : o.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : o.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/maintenance/${o.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
