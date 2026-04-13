'use client';

import { useMemo, useState } from 'react';
import { Eye, Plus, Users } from 'lucide-react';
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

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  applicantCount: number;
  postedDate: string;
  closingDate: string;
  status: string;
}

interface RecruitmentResponse {
  items: JobPosting[];
  total: number;
}

const STATUS_OPTIONS = [
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
  { label: 'Draft', value: 'draft' },
  { label: 'On Hold', value: 'on_hold' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RecruitmentPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (status) p['status'] = status;
    return p;
  }, [search, status]);

  const { data, loading } = useApi<RecruitmentResponse>('/recruitment/postings', params);
  const postings = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Recruitment</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Job postings and application tracking</p>
        </div>
        <Link href="/recruitment/new">
          <Button variant="primary"><Plus className="h-4 w-4" /> New Posting</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search job postings..." statusOptions={STATUS_OPTIONS} statusValue={status} onStatusChange={setStatus} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : postings.length === 0 ? (
        <EmptyState context="search-results" message="No job postings found" ctaLabel="Create Posting" onCtaClick={() => router.push('/recruitment/new')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Applicants</th>
                <th className="px-4 py-3">Posted</th>
                <th className="px-4 py-3">Closing</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {postings.map((j) => (
                <tr key={j.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-medium">{j.title}</td>
                  <td className="px-4 py-3">{j.department}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{j.location}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{j.type}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {j.applicantCount}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(j.postedDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(j.closingDate).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${j.status === 'open' ? 'bg-green-100 text-green-800' : j.status === 'closed' ? 'bg-gray-100 text-gray-600' : j.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                      {j.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/recruitment/${j.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /> View</Button></Link>
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
