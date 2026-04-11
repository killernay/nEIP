'use client';

import { useCallback, useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { SkeletonRow } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentTerm {
  id: string;
  code: string;
  name: string;
  dueDays: number;
  discountDays: number | null;
  discountPercent: number | null;
  isDefault: boolean;
}

interface PaymentTermsResponse {
  items: PaymentTerm[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PaymentTermsPage(): React.JSX.Element {
  const router = useRouter();
  const { data, loading, refetch } = useApi<PaymentTermsResponse>('/settings/payment-terms');
  const terms = data?.items ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ code: '', name: '', dueDays: '', discountDays: '', discountPercent: '' });
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ code: '', name: '', dueDays: '30', discountDays: '', discountPercent: '' });
  const [deleteTarget, setDeleteTarget] = useState<PaymentTerm | null>(null);
  const [deleting, setDeleting] = useState(false);

  const inputClasses = cn(
    'h-9 rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm',
    'text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]',
  );

  const startEdit = useCallback((term: PaymentTerm) => {
    setEditingId(term.id);
    setEditForm({
      code: term.code,
      name: term.name,
      dueDays: String(term.dueDays),
      discountDays: term.discountDays != null ? String(term.discountDays) : '',
      discountPercent: term.discountPercent != null ? String(term.discountPercent) : '',
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    try {
      await api.patch(`/settings/payment-terms/${editingId}`, {
        code: editForm.code,
        name: editForm.name,
        dueDays: Number(editForm.dueDays),
        discountDays: editForm.discountDays ? Number(editForm.discountDays) : null,
        discountPercent: editForm.discountPercent ? Number(editForm.discountPercent) : null,
      });
      showToast.success('Payment term updated');
      setEditingId(null);
      refetch();
    } catch {
      showToast.error('Failed to update payment term');
    }
  }, [editingId, editForm, refetch]);

  const handleCreate = useCallback(async () => {
    try {
      await api.post('/settings/payment-terms', {
        code: newForm.code,
        name: newForm.name,
        dueDays: Number(newForm.dueDays),
        discountDays: newForm.discountDays ? Number(newForm.discountDays) : null,
        discountPercent: newForm.discountPercent ? Number(newForm.discountPercent) : null,
      });
      showToast.success('Payment term created');
      setNewForm({ code: '', name: '', dueDays: '30', discountDays: '', discountPercent: '' });
      setAdding(false);
      refetch();
    } catch {
      showToast.error('Failed to create payment term');
    }
  }, [newForm, refetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/settings/payment-terms/${deleteTarget.id}`);
      showToast.success(`Payment term "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      refetch();
    } catch {
      showToast.error('Failed to delete payment term');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refetch]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} aria-label="Back to settings">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Payment Terms</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Configure payment term templates (e.g., Net 30, 2/10 Net 30)
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          Add Term
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonRow count={4} />
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Due Days</th>
                  <th className="px-4 py-3 text-right">Discount Days</th>
                  <th className="px-4 py-3 text-right">Discount %</th>
                  <th className="px-4 py-3">Default</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adding && (
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-accent)]/10">
                    <td className="px-4 py-2">
                      <input value={newForm.code} onChange={(e) => setNewForm({ ...newForm, code: e.target.value })} placeholder="NET30" className={cn(inputClasses, 'w-24')} />
                    </td>
                    <td className="px-4 py-2">
                      <input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} placeholder="Net 30 Days" className={cn(inputClasses, 'w-40')} />
                    </td>
                    <td className="px-4 py-2">
                      <input value={newForm.dueDays} onChange={(e) => setNewForm({ ...newForm, dueDays: e.target.value })} className={cn(inputClasses, 'w-16 text-right')} />
                    </td>
                    <td className="px-4 py-2">
                      <input value={newForm.discountDays} onChange={(e) => setNewForm({ ...newForm, discountDays: e.target.value })} placeholder="—" className={cn(inputClasses, 'w-16 text-right')} />
                    </td>
                    <td className="px-4 py-2">
                      <input value={newForm.discountPercent} onChange={(e) => setNewForm({ ...newForm, discountPercent: e.target.value })} placeholder="—" className={cn(inputClasses, 'w-16 text-right')} />
                    </td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={handleCreate}><Save className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setAdding(false)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                )}
                {terms.map((term) => (
                  <tr key={term.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent)]/30">
                    {editingId === term.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} className={cn(inputClasses, 'w-24')} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={cn(inputClasses, 'w-40')} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.dueDays} onChange={(e) => setEditForm({ ...editForm, dueDays: e.target.value })} className={cn(inputClasses, 'w-16 text-right')} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.discountDays} onChange={(e) => setEditForm({ ...editForm, discountDays: e.target.value })} className={cn(inputClasses, 'w-16 text-right')} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editForm.discountPercent} onChange={(e) => setEditForm({ ...editForm, discountPercent: e.target.value })} className={cn(inputClasses, 'w-16 text-right')} />
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={handleSaveEdit}><Save className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono text-xs font-medium">{term.code}</td>
                        <td className="px-4 py-3">{term.name}</td>
                        <td className="px-4 py-3 text-right font-mono-figures">{term.dueDays}</td>
                        <td className="px-4 py-3 text-right font-mono-figures text-[var(--color-muted-foreground)]">
                          {term.discountDays ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-figures text-[var(--color-muted-foreground)]">
                          {term.discountPercent != null ? `${term.discountPercent}%` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {term.isDefault && (
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Default</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(term)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {!term.isDefault && (
                              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(term)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Payment Term"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"?`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
