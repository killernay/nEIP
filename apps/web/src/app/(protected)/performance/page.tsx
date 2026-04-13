'use client';

import { useMemo, useState } from 'react';
import { Eye, Plus, Star } from 'lucide-react';
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

interface PerformanceReview {
  id: string;
  employeeName: string;
  reviewerName: string;
  period: string;
  rating: number | null;
  goalCount: number;
  completedGoals: number;
  status: string;
}

interface PerformanceResponse {
  items: PerformanceReview[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Completed', value: 'completed' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PerformancePage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<PerformanceResponse>('/performance/reviews', params);
  const reviews = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Performance Reviews</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage employee reviews and goal tracking</p>
        </div>
        <Link href="/performance/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Review</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search reviews..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : reviews.length === 0 ? (
        <EmptyState context="search-results" message="No performance reviews found" ctaLabel="Create Review" onCtaClick={() => router.push('/performance/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Reviewer</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Goals</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{r.reviewerName}</td>
                  <td className="px-4 py-3">{r.period}</td>
                  <td className="px-4 py-3">
                    {r.rating !== null ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        {r.rating.toFixed(1)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.completedGoals}/{r.goalCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${r.status === 'completed' ? 'bg-green-100 text-green-800' : r.status === 'in_review' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/performance/${r.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
