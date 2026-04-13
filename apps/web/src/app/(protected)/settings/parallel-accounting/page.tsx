'use client';

import { useCallback, useState } from 'react';
import { BookOpen, Check } from 'lucide-react';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountingStandard {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  isPrimary: boolean;
}

interface StandardsResponse {
  items: AccountingStandard[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ParallelAccountingPage(): React.JSX.Element {
  const { data, loading, refetch } = useApi<StandardsResponse>('/settings/accounting-standards');
  const standards = data?.items ?? [];
  const [saving, setSaving] = useState(false);

  const handleSetPrimary = useCallback(async (std: AccountingStandard) => {
    setSaving(true);
    try {
      await api.patch(`/settings/accounting-standards/${std.id}/set-primary`);
      showToast.success(`${std.name} set as primary standard`);
      refetch();
    } catch {
      showToast.error('Failed to update primary standard');
    } finally {
      setSaving(false);
    }
  }, [refetch]);

  const handleToggle = useCallback(async (std: AccountingStandard) => {
    try {
      await api.patch(`/settings/accounting-standards/${std.id}`, { isActive: !std.isActive });
      showToast.success(`${std.name} ${std.isActive ? 'disabled' : 'enabled'}`);
      refetch();
    } catch {
      showToast.error('Failed to update standard');
    }
  }, [refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Parallel Accounting</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Configure accounting standards for multi-GAAP reporting</p>
      </div>

      {loading ? (
        <SkeletonRow count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {standards.map((std) => (
            <div key={std.id} className={`rounded-lg border p-5 ${std.isPrimary ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] bg-[var(--color-card)]'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">{std.code}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{std.name}</p>
                  </div>
                </div>
                {std.isPrimary && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                    <Check className="h-3 w-3" /> Primary
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">{std.description}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleToggle(std)}>
                  {std.isActive ? 'Disable' : 'Enable'}
                </Button>
                {!std.isPrimary && std.isActive && (
                  <Button variant="primary" size="sm" onClick={() => handleSetPrimary(std)} disabled={saving}>
                    Set Primary
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
