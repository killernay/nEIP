'use client';

import { useCallback, useMemo, useState } from 'react';
import { Eye, Plus, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Shipment {
  id: string;
  shipmentNumber: string;
  salesOrderNumber: string;
  customerName: string;
  carrier: string;
  trackingNumber: string | null;
  packageCount: number;
  shipDate: string;
  status: string;
}

interface ShipmentResponse {
  items: Shipment[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Packing', value: 'packing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ShipmentsPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading, refetch } = useApi<ShipmentResponse>('/shipments', params);
  const shipments = data?.items ?? [];

  const handleShip = useCallback(async (id: string) => {
    try {
      await api.post(`/shipments/${id}/ship`);
      showToast.success('Shipment dispatched');
      refetch();
    } catch {
      showToast.error('Failed to dispatch shipment');
    }
  }, [refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Shipments</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Pack, ship, and track outbound deliveries</p>
        </div>
        <Link href="/shipments/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Shipment</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search shipments..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : shipments.length === 0 ? (
        <EmptyState context="search-results" message="No shipments found" ctaLabel="Create Shipment" onCtaClick={() => router.push('/shipments/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Shipment #</th>
                <th className="px-4 py-3">Sales Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Carrier</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3 text-right">Packages</th>
                <th className="px-4 py-3">Ship Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium font-mono text-xs">{s.shipmentNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">{s.salesOrderNumber}</td>
                  <td className="px-4 py-3">{s.customerName}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{s.carrier}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.trackingNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{s.packageCount}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(s.shipDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${s.status === 'delivered' ? 'bg-green-100 text-green-800' : s.status === 'shipped' ? 'bg-blue-100 text-blue-800' : s.status === 'ready' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/shipments/${s.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></Link>
                      {s.status === 'ready' && (
                        <Button variant="ghost" size="sm" onClick={() => handleShip(s.id)}>
                          <Truck className="h-3.5 w-3.5" /> Ship
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
    </div>
  );
}
