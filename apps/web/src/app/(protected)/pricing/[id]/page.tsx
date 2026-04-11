'use client';

import { useCallback, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/components/domain/money-display';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PriceItem {
  id: string;
  productCode: string;
  productName: string;
  unitPriceSatang: string;
  unit: string;
  minQty: number;
}

interface PriceListDetail {
  id: string;
  name: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  items: PriceItem[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PriceListDetailPage(): React.JSX.Element {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data, loading, refetch } = useApi<PriceListDetail>(`/pricing/price-lists/${id}`);

  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ productCode: '', productName: '', unitPriceSatang: '', unit: 'EA', minQty: '1' });

  const inputClasses = cn(
    'h-9 rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm',
    'text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]',
  );

  const handleAddItem = useCallback(async () => {
    try {
      await api.post(`/pricing/price-lists/${id}/items`, {
        productCode: newItem.productCode,
        productName: newItem.productName,
        unitPriceSatang: newItem.unitPriceSatang,
        unit: newItem.unit,
        minQty: Number(newItem.minQty),
      });
      showToast.success('Item added');
      setNewItem({ productCode: '', productName: '', unitPriceSatang: '', unit: 'EA', minQty: '1' });
      setAddingItem(false);
      refetch();
    } catch {
      showToast.error('Failed to add item');
    }
  }, [id, newItem, refetch]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    try {
      await api.delete(`/pricing/price-lists/${id}/items/${itemId}`);
      showToast.success('Item removed');
      refetch();
    } catch {
      showToast.error('Failed to remove item');
    }
  }, [id, refetch]);

  if (loading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <SkeletonRow count={6} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 lg:p-6">
        <p className="text-sm text-[var(--color-muted-foreground)]">Price list not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/pricing')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{data.name}</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {data.currency} | Effective: {new Date(data.effectiveFrom).toLocaleDateString('th-TH')}
              {data.effectiveTo ? ` — ${new Date(data.effectiveTo).toLocaleDateString('th-TH')}` : ' — ongoing'}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${data.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {data.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Items */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Price Items ({data.items.length})
          </h2>
          <Button variant="outline" size="sm" onClick={() => setAddingItem(!addingItem)}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Product Code</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Min Qty</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {addingItem && (
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-accent)]/10">
                  <td className="px-4 py-2">
                    <input value={newItem.productCode} onChange={(e) => setNewItem({ ...newItem, productCode: e.target.value })} placeholder="Code" className={cn(inputClasses, 'w-28')} />
                  </td>
                  <td className="px-4 py-2">
                    <input value={newItem.productName} onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })} placeholder="Name" className={cn(inputClasses, 'w-48')} />
                  </td>
                  <td className="px-4 py-2">
                    <input value={newItem.unitPriceSatang} onChange={(e) => setNewItem({ ...newItem, unitPriceSatang: e.target.value })} placeholder="Satang" className={cn(inputClasses, 'w-28 text-right')} />
                  </td>
                  <td className="px-4 py-2">
                    <input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} className={cn(inputClasses, 'w-16')} />
                  </td>
                  <td className="px-4 py-2">
                    <input value={newItem.minQty} onChange={(e) => setNewItem({ ...newItem, minQty: e.target.value })} className={cn(inputClasses, 'w-16 text-right')} />
                  </td>
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="sm" onClick={handleAddItem}>
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </Button>
                  </td>
                </tr>
              )}
              {data.items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-mono text-xs">{item.productCode}</td>
                  <td className="px-4 py-3 font-medium">{item.productName}</td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={BigInt(item.unitPriceSatang)} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{item.unit}</td>
                  <td className="px-4 py-3 text-right font-mono-figures">{item.minQty}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
