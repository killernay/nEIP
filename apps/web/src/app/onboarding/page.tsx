'use client';

import { useCallback, useState } from 'react';
import { Building2, Boxes, GitBranch, Users, Rocket, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingData {
  companyName: string;
  taxId: string;
  industry: string;
  selectedModules: string[];
  companyStructure: string;
  adminEmail: string;
  adminName: string;
  goLiveDate: string;
}

const STEPS = [
  { key: 'company', label: 'Company Info', icon: Building2 },
  { key: 'industry', label: 'Industry Template', icon: Boxes },
  { key: 'modules', label: 'Modules', icon: Boxes },
  { key: 'structure', label: 'Structure', icon: GitBranch },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'golive', label: 'Go-Live', icon: Rocket },
] as const;

const INDUSTRIES = [
  'Manufacturing', 'Retail & Distribution', 'Professional Services',
  'Construction', 'Food & Beverage', 'Healthcare', 'Logistics',
];

const MODULES = [
  'General Ledger', 'Accounts Receivable', 'Accounts Payable', 'Inventory',
  'Purchasing', 'Sales', 'Payroll', 'HR', 'Manufacturing', 'Project Accounting',
  'Fixed Assets', 'Bank Reconciliation', 'Tax & WHT', 'Budgeting',
];

const STRUCTURES = ['Single Company', 'Multi-Company', 'Multi-Company + Consolidation'];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OnboardingPage(): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    companyName: '', taxId: '', industry: '', selectedModules: [],
    companyStructure: 'Single Company', adminEmail: '', adminName: '', goLiveDate: '',
  });

  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleModule = useCallback((mod: string) => {
    setData((prev) => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(mod)
        ? prev.selectedModules.filter((m) => m !== mod)
        : [...prev.selectedModules, mod],
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await api.post('/onboarding/setup', data);
      showToast.success('Setup complete! Redirecting...');
      router.push('/login');
    } catch {
      showToast.error('Setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [data, router]);

  const inputClass = 'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]';

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">nEIP Setup Wizard</h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">Configure your ERP system in 6 easy steps</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${done ? 'border-green-500 bg-green-500 text-white' : active ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] text-[var(--color-muted-foreground)]'}`}>
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-8 ${i < step ? 'bg-green-500' : 'bg-[var(--color-border)]'}`} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-sm font-medium text-[var(--color-foreground)]">
          Step {step + 1}: {STEPS[step].label}
        </p>

        {/* Step Content */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[var(--color-foreground)]">Company Name
                <input className={inputClass} value={data.companyName} onChange={(e) => update({ companyName: e.target.value })} placeholder="บริษัท ตัวอย่าง จำกัด" />
              </label>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">Tax ID
                <input className={inputClass} value={data.taxId} onChange={(e) => update({ taxId: e.target.value })} placeholder="0-1234-56789-01-2" />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {INDUSTRIES.map((ind) => (
                <button key={ind} type="button" onClick={() => update({ industry: ind })} className={`rounded-lg border p-4 text-left text-sm font-medium transition-colors ${data.industry === ind ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]/50'}`}>
                  {ind}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((mod) => (
                <label key={mod} className="flex items-center gap-2 rounded-md border border-[var(--color-border)] p-3 text-sm hover:bg-[var(--color-accent)]/30">
                  <input type="checkbox" checked={data.selectedModules.includes(mod)} onChange={() => toggleModule(mod)} className="rounded" />
                  {mod}
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {STRUCTURES.map((s) => (
                <button key={s} type="button" onClick={() => update({ companyStructure: s })} className={`w-full rounded-lg border p-4 text-left text-sm font-medium transition-colors ${data.companyStructure === s ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}`}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[var(--color-foreground)]">Admin Name
                <input className={inputClass} value={data.adminName} onChange={(e) => update({ adminName: e.target.value })} placeholder="สมชาย ตัวอย่าง" />
              </label>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">Admin Email
                <input className={inputClass} type="email" value={data.adminEmail} onChange={(e) => update({ adminEmail: e.target.value })} placeholder="admin@example.com" />
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[var(--color-foreground)]">Go-Live Date
                <input className={inputClass} type="date" value={data.goLiveDate} onChange={(e) => update({ goLiveDate: e.target.value })} />
              </label>
              <div className="rounded-md bg-[var(--color-accent)]/30 p-4 text-sm">
                <p className="font-medium">Summary</p>
                <ul className="mt-2 space-y-1 text-[var(--color-muted-foreground)]">
                  <li>Company: {data.companyName || '—'}</li>
                  <li>Industry: {data.industry || '—'}</li>
                  <li>Modules: {data.selectedModules.length} selected</li>
                  <li>Structure: {data.companyStructure}</li>
                  <li>Admin: {data.adminName || '—'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 5 ? (
            <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Setting up...' : 'Complete Setup'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
