'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { showToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface ApprovalStep {
  stepOrder: number;
  roleName: string;
  approverName: string | null;
  isRequired: boolean;
}

interface ApprovalWorkflow {
  id: string;
  name: string;
  documentType: string;
  description: string;
  isActive: boolean;
  steps: ApprovalStep[];
}

interface WorkflowListResponse { items: ApprovalWorkflow[]; total: number; }

const DOC_TYPE_LABELS: Record<string, string> = {
  purchase_order: 'Purchase Order',
  purchase_requisition: 'Purchase Requisition',
  bill_payment: 'Bill Payment',
  journal_entry: 'Journal Entry',
  invoice: 'Invoice',
  expense: 'Expense',
};

export default function ApprovalsPage(): React.JSX.Element {
  const tenantId = useAuthStore((s) => s.tenantId) ?? 'default';
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<WorkflowListResponse>({
    queryKey: [tenantId, 'approval-workflows'],
    queryFn: () => api.get<WorkflowListResponse>('/settings/approval-workflows'),
  });

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this approval workflow? This action cannot be undone.')) return;
    try {
      await api.delete(`/settings/approval-workflows/${id}`);
      showToast.success('Workflow deleted');
      refetch();
    } catch {
      showToast.error('Failed to delete workflow');
    }
  }, [refetch]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Approval Workflows</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">Configure multi-step approval rules by document type</p>
        </div>
        <Button variant="primary"><Plus className="h-4 w-4" />New Workflow</Button>
      </div>

      {isLoading ? (
        <SkeletonRow count={5} />
      ) : items.length === 0 ? (
        <EmptyState context="search-results" message="No approval workflows configured" />
      ) : (
        <div className="space-y-3">
          {items.map((wf) => (
            <div key={wf.id} className="rounded-lg border border-[var(--color-border)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                  <div>
                    <h3 className="font-medium">{wf.name}</h3>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {DOC_TYPE_LABELS[wf.documentType] ?? wf.documentType} — {wf.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    wf.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {wf.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === wf.id ? null : wf.id)}
                  >
                    {expandedId === wf.id ? 'Hide Steps' : `${wf.steps.length} Steps`}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(wf.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {expandedId === wf.id && (
                <div className="mt-4 ml-8">
                  <div className="space-y-2">
                    {wf.steps.map((step) => (
                      <div
                        key={step.stepOrder}
                        className="flex items-center gap-3 rounded border border-[var(--color-border)] px-3 py-2 text-sm"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-medium">
                          {step.stepOrder}
                        </span>
                        <span className="font-medium">{step.roleName}</span>
                        {step.approverName && (
                          <span className="text-[var(--color-muted-foreground)]">({step.approverName})</span>
                        )}
                        {step.isRequired && (
                          <span className="ml-auto text-xs text-red-500">Required</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
