'use client';

import { useCallback, useState } from 'react';
import { Boxes, AlertTriangle } from 'lucide-react';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Module {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  dependencies: string[];
}

interface ModuleListResponse {
  items: Module[];
  total: number;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ModulesSettingsPage(): React.JSX.Element {
  const { data, loading, refetch } = useApi<ModuleListResponse>('/settings/modules');
  const modules = data?.items ?? [];
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = useCallback(async (mod: Module) => {
    setToggling(mod.id);
    try {
      await api.patch(`/settings/modules/${mod.id}`, { isActive: !mod.isActive });
      showToast.success(`${mod.name} ${mod.isActive ? 'disabled' : 'enabled'}`);
      refetch();
    } catch {
      showToast.error(`Failed to toggle ${mod.name}`);
    } finally {
      setToggling(null);
    }
  }, [refetch]);

  const categories = [...new Set(modules.map((m) => m.category))];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Module Management</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Activate or deactivate modules for your organization</p>
      </div>

      {loading ? (
        <SkeletonRow count={8} />
      ) : (
        categories.map((cat) => (
          <div key={cat} className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-medium text-[var(--color-foreground)]">
              <Boxes className="h-5 w-5" /> {cat}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.filter((m) => m.category === cat).map((mod) => (
                <div key={mod.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-[var(--color-foreground)]">{mod.name}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{mod.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle(mod)}
                      disabled={toggling === mod.id}
                      className={`relative h-6 w-11 rounded-full transition-colors ${mod.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${mod.isActive ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {mod.dependencies.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                      <AlertTriangle className="h-3 w-3" />
                      Requires: {mod.dependencies.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
