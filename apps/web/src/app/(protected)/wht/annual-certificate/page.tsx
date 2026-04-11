'use client';

import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/components/domain/money-display';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhtCertificate {
  id: string;
  certificateNumber: string;
  payeeName: string;
  payeeTaxId: string;
  taxYear: number;
  totalIncomeSatang: string;
  totalWhtSatang: string;
  incomeType: string;
  generatedAt: string | null;
}

interface CertificateListResponse {
  items: WhtCertificate[];
  total: number;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WhtAnnualCertificatePage(): React.JSX.Element {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()));

  const params = useMemo(() => {
    const p: Record<string, string> = { taxYear };
    if (search) p['search'] = search;
    return p;
  }, [search, taxYear]);

  const { data, loading } = useApi<CertificateListResponse>('/wht/annual-certificates', params);
  const certificates = data?.items ?? [];

  const inputClasses = cn(
    'h-10 rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm',
    'text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]',
  );

  const handleGenerate = useCallback(async (certId: string) => {
    try {
      await api.post(`/wht/annual-certificates/${certId}/generate`);
      showToast.success('Certificate generated (50 ทวิ)');
    } catch {
      showToast.error('Failed to generate certificate');
    }
  }, []);

  const handleBulkGenerate = useCallback(async () => {
    try {
      await api.post('/wht/annual-certificates/bulk-generate', { taxYear: Number(taxYear) });
      showToast.success(`Bulk generation started for tax year ${taxYear}`);
    } catch {
      showToast.error('Failed to start bulk generation');
    }
  }, [taxYear]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/wht')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">WHT Annual Certificates (50 ทวิ)</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Generate annual withholding tax certificates for payees
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={handleBulkGenerate}>
          <FileText className="h-4 w-4" />
          Bulk Generate
        </Button>
      </div>

      {/* Year selector + search */}
      <div className="flex items-end gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="space-y-1.5">
          <label htmlFor="taxYear" className="text-sm font-medium text-[var(--color-foreground)]">Tax Year</label>
          <input id="taxYear" type="number" value={taxYear} onChange={(e) => setTaxYear(e.target.value)} className={cn(inputClasses, 'w-24')} />
        </div>
        <div className="flex-1">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by payee name or tax ID..."
            resultCount={data?.total}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonRow count={5} />
      ) : certificates.length === 0 ? (
        <EmptyState context="wht-list" message="No annual certificates" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Certificate #</th>
                <th className="px-4 py-3">Payee</th>
                <th className="px-4 py-3">Tax ID</th>
                <th className="px-4 py-3">Income Type</th>
                <th className="px-4 py-3 text-right">Total Income</th>
                <th className="px-4 py-3 text-right">WHT Amount</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3 font-mono-figures font-medium">{cert.certificateNumber}</td>
                  <td className="px-4 py-3 font-medium">{cert.payeeName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-muted-foreground)]">{cert.payeeTaxId}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">{cert.incomeType}</td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={BigInt(cert.totalIncomeSatang)} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyDisplay amount={BigInt(cert.totalWhtSatang)} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleGenerate(cert.id)}>
                        <Download className="h-3.5 w-3.5" />
                        {cert.generatedAt ? 'Regenerate' : 'Generate'}
                      </Button>
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
