'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, Network } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface Position {
  id: string;
  code: string;
  titleTh: string;
  titleEn: string;
  departmentName: string;
  level: number;
  headcount: number;
  filled: number;
  parentPositionId: string | null;
}

interface PositionListResponse { items: Position[]; total: number; }

export default function PositionsPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'tree'>('list');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    return p;
  }, [search]);

  const { data, isLoading } = useQuery<PositionListResponse>({
    queryKey: [tenantId, 'positions', params],
    queryFn: () => api.get<PositionListResponse>('/positions', params),
  });

  const items = data?.items ?? [];

  // Simple tree view: group by level
  const renderTree = () => {
    const roots = items.filter((p) => !p.parentPositionId);
    const children = items.filter((p) => p.parentPositionId);

    return (
      <div className="space-y-2">
        {roots.map((root) => (
          <div key={root.id} className="rounded-lg border border-[var(--color-border)] p-4">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <span className="font-medium">{root.titleTh}</span>
              <span className="text-xs text-[var(--color-muted-foreground)]">({root.code})</span>
              <span className="ml-auto text-sm text-[var(--color-muted-foreground)]">
                {root.filled}/{root.headcount} filled
              </span>
            </div>
            <div className="ml-6 mt-2 space-y-1">
              {children
                .filter((c) => c.parentPositionId === root.id)
                .map((child) => (
                  <div key={child.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[var(--color-accent)]/30">
                    <span className="text-[var(--color-muted-foreground)]">|--</span>
                    <span>{child.titleTh}</span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">({child.code})</span>
                    <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                      {child.filled}/{child.headcount}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Positions</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Organization positions and hierarchy</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-[var(--color-border)]">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm ${view === 'list' ? 'bg-[var(--color-accent)]' : ''}`}
            >
              <Users className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('tree')}
              className={`px-3 py-1.5 text-sm ${view === 'tree' ? 'bg-[var(--color-accent)]' : ''}`}
            >
              <Network className="h-4 w-4" />
            </button>
          </div>
          <Link href="/positions/new">
            <Button variant="primary"><Plus className="h-4 w-4" />Add Position</Button>
          </Link>
        </div>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search positions..."
        resultCount={data?.total}
      />

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No positions found" />
      ) : view === 'tree' ? (
        renderTree()
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Code</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Title (TH)</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Title (EN)</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Department</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Level</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-muted-foreground)]">Headcount</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pos) => (
                <tr key={pos.id} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-mono text-xs">{pos.code}</td>
                  <td className="px-4 py-3 font-medium">{pos.titleTh}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{pos.titleEn}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{pos.departmentName}</td>
                  <td className="px-4 py-3 text-center">{pos.level}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={pos.filled < pos.headcount ? 'text-amber-600' : 'text-green-600'}>
                      {pos.filled}/{pos.headcount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/positions/${pos.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
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
