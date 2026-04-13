'use client';

import { useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
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

interface ProductionOrder {
  id: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  unit: string;
  plannedStart: string;
  plannedEnd: string;
  completedQty: number;
  status: string;
}

interface ProductionResponse {
  items: ProductionOrder[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Planned', value: 'planned' },
  { label: 'Released', value: 'released' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProductionPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<ProductionResponse>('/manufacturing/production-orders', params);
  const orders = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Production Orders</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Plan and track manufacturing production</p>
        </div>
        <Link href="/manufacturing/production/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Order</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search production orders..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : orders.length === 0 ? (
        <EmptyState context="search-results" message="No production orders found" ctaLabel="Create Order" onCtaClick={() => router.push('/manufacturing/production/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Planned Qty</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3">Planned Start</th>
                <th className="px-4 py-3">Planned End</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.productName}</td>
                  <td className="px-4 py-3 text-right font-mono">{o.quantity} {o.unit}</td>
                  <td className="px-4 py-3 text-right font-mono">{o.completedQty} {o.unit}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(o.plannedStart).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(o.plannedEnd).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${o.status === 'completed' ? 'bg-green-100 text-green-800' : o.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : o.status === 'released' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/manufacturing/production/${o.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
