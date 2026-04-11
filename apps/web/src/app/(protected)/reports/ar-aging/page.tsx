'use client';

import React, { useCallback, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { SkeletonRow } from '@/components/ui/skeleton';
import { MoneyDisplay } from '@/components/domain/money-display';
import { showToast } from '@/components/ui/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MoneyVO {
  amountSatang: string;
  currency: string;
}

interface AgingBuckets {
  current: MoneyVO;
  days1to30: MoneyVO;
  days31to60: MoneyVO;
  days61to90: MoneyVO;
  over90: MoneyVO;
}

interface CustomerInvoice {
  invoiceNumber: string;
  outstandingSatang: string;
  dueDate: string;
  daysOverdue: number;
}

interface CustomerAging {
  customerId: string;
  customerName: string;
  current: MoneyVO;
  days1to30: MoneyVO;
  days31to60: MoneyVO;
  days61to90: MoneyVO;
  over90: MoneyVO;
  total: MoneyVO;
  invoices: CustomerInvoice[];
}

interface ArAgingReport {
  reportName: string;
  generatedAt: string;
  asOfDate: string;
  buckets: AgingBuckets;
  total: MoneyVO;
  customers: CustomerAging[];
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function moneyAmount(m: MoneyVO): bigint {
  return BigInt(m.amountSatang);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ArAgingPage(): React.JSX.Element {
  const router = useRouter();

  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ArAgingReport | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  const inputClasses = cn(
    'h-10 rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm',
    'text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]',
  );

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ArAgingReport>('/reports/ar-aging', { asOfDate });
      setReport(data);
    } catch {
      showToast.error('Failed to generate AR Aging report');
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  const toggleCustomer = useCallback((customerId: string) => {
    setExpandedCustomer((prev) => (prev === customerId ? null : customerId));
  }, []);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/reports')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">AR Aging Report</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Outstanding customer invoices by aging bucket
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-end gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="space-y-1.5">
          <label htmlFor="asOfDate" className="text-sm font-medium text-[var(--color-foreground)]">
            As of Date
          </label>
          <input
            id="asOfDate"
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className={inputClasses}
          />
        </div>
        <Button variant="primary" onClick={handleGenerate} loading={loading}>
          Generate Report
        </Button>
      </div>

      {/* Report content */}
      {loading ? (
        <SkeletonRow count={5} />
      ) : report !== null ? (
        <div className="space-y-6">
          {/* Summary buckets */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <h2 className="mb-3 text-base font-semibold text-[var(--color-foreground)]">
              Aging Summary
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Current</p>
                <MoneyDisplay amount={moneyAmount(report.buckets.current)} size="md" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">1-30 Days</p>
                <MoneyDisplay amount={moneyAmount(report.buckets.days1to30)} size="md" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">31-60 Days</p>
                <MoneyDisplay amount={moneyAmount(report.buckets.days31to60)} size="md" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">61-90 Days</p>
                <MoneyDisplay amount={moneyAmount(report.buckets.days61to90)} size="md" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-overdue)]">Over 90 Days</p>
                <MoneyDisplay amount={moneyAmount(report.buckets.over90)} size="md" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-foreground)]">Total</p>
                <MoneyDisplay amount={moneyAmount(report.total)} size="md" />
              </div>
            </div>
          </div>

          {/* Customer detail table */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
            <h2 className="border-b border-[var(--color-border)] p-4 text-base font-semibold text-[var(--color-foreground)]">
              By Customer
            </h2>
            {report.customers.length === 0 ? (
              <p className="p-4 text-sm text-[var(--color-muted-foreground)]">
                No outstanding invoices found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 text-right">Current</th>
                      <th className="px-4 py-3 text-right">1-30</th>
                      <th className="px-4 py-3 text-right">31-60</th>
                      <th className="px-4 py-3 text-right">61-90</th>
                      <th className="px-4 py-3 text-right">Over 90</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.customers.map((customer) => (
                      <React.Fragment key={customer.customerId}>
                        <tr
                          className="cursor-pointer border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]/30"
                          onClick={() => toggleCustomer(customer.customerId)}
                        >
                          <td className="px-4 py-3 font-medium">{customer.customerName}</td>
                          <td className="px-4 py-3 text-right">
                            <MoneyDisplay amount={moneyAmount(customer.current)} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <MoneyDisplay amount={moneyAmount(customer.days1to30)} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <MoneyDisplay amount={moneyAmount(customer.days31to60)} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <MoneyDisplay amount={moneyAmount(customer.days61to90)} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <MoneyDisplay amount={moneyAmount(customer.over90)} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            <MoneyDisplay amount={moneyAmount(customer.total)} size="sm" />
                          </td>
                        </tr>
                        {expandedCustomer === customer.customerId && customer.invoices.map((inv) => (
                          <tr
                            key={inv.invoiceNumber}
                            className="border-b border-[var(--color-border)] bg-[var(--color-accent)]/10"
                          >
                            <td className="px-4 py-2 pl-8 text-[var(--color-muted-foreground)]">
                              {inv.invoiceNumber}
                            </td>
                            <td colSpan={4} className="px-4 py-2 text-right text-[var(--color-muted-foreground)]">
                              Due: {new Date(inv.dueDate).toLocaleDateString('th-TH')}
                              {inv.daysOverdue > 0 && (
                                <span className="ml-2 text-[var(--color-overdue)]">
                                  ({inv.daysOverdue} days overdue)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2" />
                            <td className="px-4 py-2 text-right">
                              <MoneyDisplay amount={BigInt(inv.outstandingSatang)} size="sm" />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Report metadata */}
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Report generated at {new Date(report.generatedAt).toLocaleString('th-TH')} |
            As of {new Date(report.asOfDate).toLocaleDateString('th-TH')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
