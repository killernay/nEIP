'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Building2, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface Company {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  taxId: string;
  isHeadquarter: boolean;
  branchCode: string | null;
  address: string;
  isActive: boolean;
}

interface CompanyListResponse { items: Company[]; total: number; }

export default function CompaniesPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<CompanyListResponse>({
    queryKey: [tenantId, 'companies', search],
    queryFn: () => api.get<CompanyListResponse>('/settings/companies', search ? { search } : {}),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Companies & Branches</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Manage company and branch entities</p>
        </div>
        <Link href="/settings/companies/new">
          <Button variant="primary"><Plus className="h-4 w-4" />Add Company</Button>
        </Link>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search companies..."
        resultCount={data?.total}
      />

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No companies found" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((company) => (
            <div key={company.id} className="rounded-lg border border-[var(--color-border)] p-4 hover:bg-[var(--color-accent)]/30">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                  <div>
                    <h3 className="font-medium">{company.nameTh}</h3>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{company.nameEn}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  company.isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {company.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-[var(--color-muted-foreground)]">
                <p>Code: <span className="font-mono">{company.code}</span></p>
                <p>Tax ID: <span className="font-mono">{company.taxId}</span></p>
                <p>{company.isHeadquarter ? 'Headquarter' : `Branch: ${company.branchCode ?? '—'}`}</p>
              </div>
              <div className="mt-3 flex justify-end">
                <Link href={`/settings/companies/${company.id}`}>
                  <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" />View</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
