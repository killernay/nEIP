'use client';

import { useCallback, useMemo, useState } from 'react';
import { Eye, Trash2, FileText, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { FilterBar } from '@/components/ui/filter-bar';
import { ConfirmDialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Document {
  id: string;
  name: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  linkedEntity: string | null;
  createdAt: string;
  version: number;
}

interface DocumentResponse {
  items: Document[];
  total: number;
}

const CATEGORY_OPTIONS = [
  { label: 'Invoice', value: 'invoice' },
  { label: 'Contract', value: 'contract' },
  { label: 'Receipt', value: 'receipt' },
  { label: 'Report', value: 'report' },
  { label: 'Other', value: 'other' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocumentsPage(): React.JSX.Element {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p['search'] = search;
    if (category) p['category'] = category;
    return p;
  }, [search, category]);

  const { data, loading, refetch } = useApi<DocumentResponse>('/documents', params);
  const documents = data?.items ?? [];

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      showToast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to delete document');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refetch]);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Document Management</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Centralized document storage and versioning</p>
        </div>
        <Link href="/documents/upload">
          <Button variant="primary"><Upload className="h-4 w-4" /> Upload</Button>
        </Link>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search documents..." statusOptions={CATEGORY_OPTIONS} statusValue={category} onStatusChange={setCategory} resultCount={data?.total} />

      {loading ? (
        <SkeletonRow count={5} />
      ) : documents.length === 0 ? (
        <EmptyState context="search-results" message="No documents found" ctaLabel="Upload Document" onCtaClick={() => router.push('/documents/upload')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Size</th>
                <th className="px-4 py-3 text-right">Ver</th>
                <th className="px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      <span className="font-medium">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-[var(--color-accent)]/50 px-2 py-0.5 text-xs font-medium">{d.category}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">{d.mimeType}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatSize(d.sizeBytes)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">v{d.version}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{d.uploadedBy}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(d.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/documents/${d.id}`}><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button></Link>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title="Delete Document" description={`Delete "${deleteTarget?.name ?? ''}"? This cannot be undone.`} confirmLabel="Delete" confirmVariant="destructive" onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}
