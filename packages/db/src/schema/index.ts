export { tenants } from './tenants.js';
export type { Tenant, NewTenant } from './tenants.js';

export { domain_events } from './domain-events.js';
export type { DomainEventRow, NewDomainEventRow } from './domain-events.js';

export { users } from './users.js';
export type { User, NewUser } from './users.js';

export { roles } from './roles.js';
export type { Role, NewRole } from './roles.js';

export { permissions } from './permissions.js';
export type { Permission, NewPermission } from './permissions.js';

export { role_permissions } from './role-permissions.js';
export type { RolePermission, NewRolePermission } from './role-permissions.js';

export { user_roles } from './user-roles.js';
export type { UserRole, NewUserRole } from './user-roles.js';

export { system_translations } from './system-translations.js';
export type { SystemTranslation, NewSystemTranslation } from './system-translations.js';

export { chart_of_accounts } from './chart-of-accounts.js';
export type { ChartOfAccount, NewChartOfAccount } from './chart-of-accounts.js';

export { budgets } from './budgets.js';
export type { Budget, NewBudget } from './budgets.js';

export { journal_entries } from './journal-entries.js';
export type { JournalEntry, NewJournalEntry } from './journal-entries.js';

export { journal_entry_lines } from './journal-entry-lines.js';
export type { JournalEntryLine, NewJournalEntryLine } from './journal-entry-lines.js';

export { document_sequences } from './document-sequences.js';
export type { DocumentSequence, NewDocumentSequence } from './document-sequences.js';

export { fiscal_years } from './fiscal-years.js';
export type { FiscalYear, NewFiscalYear } from './fiscal-years.js';

export { fiscal_periods } from './fiscal-periods.js';
export type { FiscalPeriod, NewFiscalPeriod } from './fiscal-periods.js';

export { audit_logs } from './audit-logs.js';
export type { AuditLog, NewAuditLog } from './audit-logs.js';

export { hitl_queue } from './hitl-queue.js';
export type { HitlQueueRow, NewHitlQueueRow } from './hitl-queue.js';

export { vendors } from './vendors.js';
export type { Vendor, NewVendor } from './vendors.js';

export { bills } from './bills.js';
export type { Bill, NewBill } from './bills.js';

export { bill_line_items } from './bill-line-items.js';
export type { BillLineItem, NewBillLineItem } from './bill-line-items.js';

export { bill_payments } from './bill-payments.js';
export type { BillPayment, NewBillPayment } from './bill-payments.js';

export { webhooks } from './webhooks.js';
export type { Webhook, NewWebhook } from './webhooks.js';

export { notification_preferences } from './notification-preferences.js';
export type { NotificationPreference, NewNotificationPreference } from './notification-preferences.js';

export { notification_log } from './notification-log.js';
export type { NotificationLog, NewNotificationLog } from './notification-log.js';

export { tax_rates } from './tax-rates.js';
export type { TaxRateRow, NewTaxRateRow } from './tax-rates.js';

export { firm_client_assignments } from './firm-client-assignments.js';
export type { FirmClientAssignment, NewFirmClientAssignment } from './firm-client-assignments.js';

export { quotations } from './quotations.js';
export type { Quotation, NewQuotation } from './quotations.js';

export { quotation_lines } from './quotation-lines.js';
export type { QuotationLine, NewQuotationLine } from './quotation-lines.js';

export { sales_orders } from './sales-orders.js';
export type { SalesOrder, NewSalesOrder } from './sales-orders.js';

export { sales_order_lines } from './sales-order-lines.js';
export type { SalesOrderLine, NewSalesOrderLine } from './sales-order-lines.js';

export { delivery_notes } from './delivery-notes.js';
export type { DeliveryNote, NewDeliveryNote } from './delivery-notes.js';

export { delivery_note_lines } from './delivery-note-lines.js';
export type { DeliveryNoteLine, NewDeliveryNoteLine } from './delivery-note-lines.js';

export { receipts } from './receipts.js';
export type { Receipt, NewReceipt } from './receipts.js';

export { credit_notes } from './credit-notes.js';
export type { CreditNote, NewCreditNote } from './credit-notes.js';

export { credit_note_lines } from './credit-note-lines.js';
export type { CreditNoteLine, NewCreditNoteLine } from './credit-note-lines.js';

export { purchase_orders } from './purchase-orders.js';
export type { PurchaseOrder, NewPurchaseOrder } from './purchase-orders.js';

export { purchase_order_lines } from './purchase-order-lines.js';
export type { PurchaseOrderLine, NewPurchaseOrderLine } from './purchase-order-lines.js';

// ---------------------------------------------------------------------------
// Inventory / MM-IM
// ---------------------------------------------------------------------------

export { products } from './products.js';
export type { Product, NewProduct } from './products.js';

export { warehouses } from './warehouses.js';
export type { Warehouse, NewWarehouse } from './warehouses.js';

export { stock_movements } from './stock-movements.js';
export type { StockMovement, NewStockMovement } from './stock-movements.js';

// ---------------------------------------------------------------------------
// CRM — Contacts
// ---------------------------------------------------------------------------

export { contacts } from './contacts.js';
export type { Contact, NewContact } from './contacts.js';

// ---------------------------------------------------------------------------
// HR — Employees & Departments
// ---------------------------------------------------------------------------

export { departments } from './departments.js';
export type { Department, NewDepartment } from './departments.js';

export { employees } from './employees.js';
export type { Employee, NewEmployee } from './employees.js';

// ---------------------------------------------------------------------------
// HR — Payroll
// ---------------------------------------------------------------------------

export { payroll_runs } from './payroll-runs.js';
export type { PayrollRun, NewPayrollRun } from './payroll-runs.js';

export { payroll_items } from './payroll-items.js';
export type { PayrollItem, NewPayrollItem } from './payroll-items.js';

// ---------------------------------------------------------------------------
// HR — Leave Management
// ---------------------------------------------------------------------------

export { leave_types } from './leave-types.js';
export type { LeaveType, NewLeaveType } from './leave-types.js';

export { leave_requests } from './leave-requests.js';
export type { LeaveRequest, NewLeaveRequest } from './leave-requests.js';

// ---------------------------------------------------------------------------
// Financial Modules (FI-AA, FI-BL, WHT, CO)
// ---------------------------------------------------------------------------

export { fixed_assets } from './fixed-assets.js';
export type { FixedAsset, NewFixedAsset } from './fixed-assets.js';

export { bank_accounts } from './bank-accounts.js';
export type { BankAccount, NewBankAccount } from './bank-accounts.js';

export { bank_transactions } from './bank-transactions.js';
export type { BankTransaction, NewBankTransaction } from './bank-transactions.js';

export { wht_certificates } from './wht-certificates.js';
export type { WhtCertificate, NewWhtCertificate } from './wht-certificates.js';

export { cost_centers } from './cost-centers.js';
export type { CostCenter, NewCostCenter } from './cost-centers.js';

export { profit_centers } from './profit-centers.js';
export type { ProfitCenter, NewProfitCenter } from './profit-centers.js';

// ---------------------------------------------------------------------------
// Phase 3 — Core Business
// ---------------------------------------------------------------------------

export { price_lists } from './price-lists.js';
export type { PriceList, NewPriceList } from './price-lists.js';

export { price_list_items } from './price-list-items.js';
export type { PriceListItem, NewPriceListItem } from './price-list-items.js';

export { payment_terms } from './payment-terms.js';
export type { PaymentTerm, NewPaymentTerm } from './payment-terms.js';

export { dunning_levels } from './dunning-levels.js';
export type { DunningLevel, NewDunningLevel } from './dunning-levels.js';

export { dunning_history } from './dunning-history.js';
export type { DunningHistoryRow, NewDunningHistoryRow } from './dunning-history.js';

export { recurring_je_templates } from './recurring-je-templates.js';
export type { RecurringJeTemplate, NewRecurringJeTemplate } from './recurring-je-templates.js';

// ---------------------------------------------------------------------------
// Phase 5 — Enterprise Features
// ---------------------------------------------------------------------------

export { currencies } from './currencies.js';
export type { Currency, NewCurrency } from './currencies.js';

export { exchange_rates } from './exchange-rates.js';
export type { ExchangeRate, NewExchangeRate } from './exchange-rates.js';

export { companies } from './companies.js';
export type { Company, NewCompany } from './companies.js';

export { approval_workflows } from './approval-workflows.js';
export type { ApprovalWorkflow, NewApprovalWorkflow } from './approval-workflows.js';

export { approval_steps } from './approval-steps.js';
export type { ApprovalStep, NewApprovalStep } from './approval-steps.js';

export { approval_requests } from './approval-requests.js';
export type { ApprovalRequest, NewApprovalRequest } from './approval-requests.js';

export { approval_actions } from './approval-actions.js';
export type { ApprovalAction, NewApprovalAction } from './approval-actions.js';

export { vendor_returns } from './vendor-returns.js';
export type { VendorReturn, NewVendorReturn } from './vendor-returns.js';

export { vendor_return_lines } from './vendor-return-lines.js';
export type { VendorReturnLine, NewVendorReturnLine } from './vendor-return-lines.js';

export { batches } from './batches.js';
export type { Batch, NewBatch } from './batches.js';

export { serial_numbers } from './serial-numbers.js';
export type { SerialNumber, NewSerialNumber } from './serial-numbers.js';

export { bank_matching_rules } from './bank-matching-rules.js';
export type { BankMatchingRule, NewBankMatchingRule } from './bank-matching-rules.js';

// ---------------------------------------------------------------------------
// Phase 4 — Operations (PR, RFQ, Stock Count, HR Positions, Attendance, Leave)
// ---------------------------------------------------------------------------

export { purchase_requisitions } from './purchase-requisitions.js';
export type { PurchaseRequisition, NewPurchaseRequisition } from './purchase-requisitions.js';

export { pr_lines } from './pr-lines.js';
export type { PrLine, NewPrLine } from './pr-lines.js';

export { rfqs } from './rfqs.js';
export type { Rfq, NewRfq } from './rfqs.js';

export { rfq_vendors } from './rfq-vendors.js';
export type { RfqVendor, NewRfqVendor } from './rfq-vendors.js';

export { stock_counts } from './stock-counts.js';
export type { StockCount, NewStockCount } from './stock-counts.js';

export { stock_count_lines } from './stock-count-lines.js';
export type { StockCountLine, NewStockCountLine } from './stock-count-lines.js';

export { positions } from './positions.js';
export type { Position, NewPosition } from './positions.js';

export { attendance_records } from './attendance-records.js';
export type { AttendanceRecord, NewAttendanceRecord } from './attendance-records.js';

export { leave_accrual_rules } from './leave-accrual-rules.js';
export type { LeaveAccrualRule, NewLeaveAccrualRule } from './leave-accrual-rules.js';

export { public_holidays } from './public-holidays.js';
export type { PublicHoliday, NewPublicHoliday } from './public-holidays.js';

// ---------------------------------------------------------------------------
// Phase 3 — Customer Price Lists
// ---------------------------------------------------------------------------

export { customer_price_lists } from './customer-price-lists.js';
export type { CustomerPriceList, NewCustomerPriceList } from './customer-price-lists.js';

// ---------------------------------------------------------------------------
// Phase 6 — AI & Analytics
// ---------------------------------------------------------------------------

export { categorization_rules } from './categorization-rules.js';
export type { CategorizationRule, NewCategorizationRule } from './categorization-rules.js';

export { saved_reports } from './saved-reports.js';
export type { SavedReport, NewSavedReport } from './saved-reports.js';

export { dashboard_configs } from './dashboard-configs.js';
export type { DashboardConfig, NewDashboardConfig } from './dashboard-configs.js';

// ---------------------------------------------------------------------------
// Manufacturing / PP
// ---------------------------------------------------------------------------

export { bom_headers } from './bom-headers.js';
export type { BomHeader, NewBomHeader } from './bom-headers.js';

export { bom_lines } from './bom-lines.js';
export type { BomLine, NewBomLine } from './bom-lines.js';

export { work_centers } from './work-centers.js';
export type { WorkCenter, NewWorkCenter } from './work-centers.js';

export { production_orders } from './production-orders.js';
export type { ProductionOrder, NewProductionOrder } from './production-orders.js';

export { production_order_components } from './production-order-components.js';
export type { ProductionOrderComponent, NewProductionOrderComponent } from './production-order-components.js';

export { production_confirmations } from './production-confirmations.js';
export type { ProductionConfirmation, NewProductionConfirmation } from './production-confirmations.js';

// ---------------------------------------------------------------------------
// Foreign Trade (FT)
// ---------------------------------------------------------------------------

export { incoterms } from './incoterms.js';
export type { Incoterm, NewIncoterm } from './incoterms.js';

export { trade_declarations } from './trade-declarations.js';
export type { TradeDeclaration, NewTradeDeclaration } from './trade-declarations.js';

export { trade_declaration_lines } from './trade-declaration-lines.js';
export type { TradeDeclarationLine, NewTradeDeclarationLine } from './trade-declaration-lines.js';

export { letters_of_credit } from './letters-of-credit.js';
export type { LetterOfCredit, NewLetterOfCredit } from './letters-of-credit.js';

export { landed_costs } from './landed-costs.js';
export type { LandedCost, NewLandedCost } from './landed-costs.js';

// ---------------------------------------------------------------------------
// Enterprise Structure
// ---------------------------------------------------------------------------

export { branches } from './branches.js';
export type { Branch, NewBranch } from './branches.js';

export { sales_channels } from './sales-channels.js';
export type { SalesChannel, NewSalesChannel } from './sales-channels.js';

// ---------------------------------------------------------------------------
// Module System
// ---------------------------------------------------------------------------

export { module_registry } from './module-registry.js';
export type { ModuleRegistry, NewModuleRegistry } from './module-registry.js';

export { tenant_modules } from './tenant-modules.js';
export type { TenantModule, NewTenantModule } from './tenant-modules.js';
