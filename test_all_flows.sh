#!/usr/bin/env bash
# =============================================================================
# nEIP — Full Integration Test Suite
# Tests ALL status transitions via curl
# =============================================================================

set -euo pipefail

API="http://localhost:5400"
PASS=0
FAIL=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

pass() { echo "[PASS] $1"; PASS=$((PASS+1)); }
fail() { echo "[FAIL] $1 — $2"; FAIL=$((FAIL+1)); }

check_status() {
  local label="$1"; local expected="$2"; local actual="$3"
  if [ "$actual" = "$expected" ]; then pass "$label"
  else fail "$label" "expected status='$expected' got '$actual'"; fi
}

check_http() {
  local label="$1"; local expected_http="$2"; local actual_http="$3"; local body="$4"
  if [ "$actual_http" = "$expected_http" ]; then pass "$label"
  else fail "$label" "expected HTTP $expected_http got $actual_http — $body"; fi
}

check_http_range() {
  local label="$1"; local min="$2"; local max="$3"; local actual="$4"; local body="$5"
  if [ "$actual" -ge "$min" ] && [ "$actual" -le "$max" ]; then pass "$label"
  else fail "$label" "expected HTTP $min-$max got $actual — $body"; fi
}

# GET request (with auth)
G() { curl -s -w '\n%{http_code}' -H "Authorization: Bearer $TOKEN" "$@"; }
# POST with JSON body
POST() { curl -s -w '\n%{http_code}' -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"; }
# POST without body (for action endpoints)
NOPOST() { curl -s -w '\n%{http_code}' -X POST -H "Authorization: Bearer $TOKEN" "$@"; }
# PUT with JSON body
PUT() { curl -s -w '\n%{http_code}' -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"; }

extract_body() { echo "$1" | head -1; }
extract_code() { echo "$1" | tail -1; }
extract_field() {
  echo "$1" | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2',''))" 2>/dev/null
}

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

LOGIN=$(curl -s -w '\n%{http_code}' -X POST "$API/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@neip.app","password":"SecurePass12345"}')
HTTP_CODE=$(extract_code "$LOGIN")
BODY=$(extract_body "$LOGIN")
TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "[FAIL] Auth: login failed — $BODY"
  exit 1
fi
pass "Auth: login returns accessToken"

# ---------------------------------------------------------------------------
# Setup: get IDs
# ---------------------------------------------------------------------------

CUST_RESP=$(G "$API/api/v1/contacts?type=customer&limit=1")
CUST_ID=$(extract_body "$CUST_RESP" | python3 -c "import sys,json; items=json.load(sys.stdin).get('items',[]); print(items[0]['id'] if items else '')" 2>/dev/null)

# AP Vendors (from /api/v1/vendors endpoint, separate from contacts)
VENDOR_RESP=$(G "$API/api/v1/vendors?limit=5")
AP_VENDOR_ID=$(extract_body "$VENDOR_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
items = data if isinstance(data,list) else data.get('items',data.get('data',[]))
for v in items:
    if isinstance(v,dict) and v.get('id'):
        print(v['id']); break
" 2>/dev/null)

ACCTS_RESP=$(G "$API/api/v1/accounts?limit=100")
EXPENSE_ACCT=$(extract_body "$ACCTS_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
accts = data if isinstance(data,list) else data.get('items',data.get('data',[]))
for a in accts:
    if isinstance(a,dict) and a.get('accountType') == 'expense':
        print(a['id']); break
" 2>/dev/null)
REVENUE_ACCT=$(extract_body "$ACCTS_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
accts = data if isinstance(data,list) else data.get('items',data.get('data',[]))
for a in accts:
    if isinstance(a,dict) and a.get('accountType') == 'revenue' and '-' not in a.get('code',''):
        print(a['id']); break
" 2>/dev/null)
AR_ACCT=$(extract_body "$ACCTS_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
accts = data if isinstance(data,list) else data.get('items',data.get('data',[]))
for a in accts:
    if isinstance(a,dict) and a.get('accountType') == 'asset' and a.get('code','').startswith('1100') and '-' not in a.get('code',''):
        print(a['id']); break
" 2>/dev/null)
AP_ACCT=$(extract_body "$ACCTS_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
accts = data if isinstance(data,list) else data.get('items',data.get('data',[]))
for a in accts:
    if isinstance(a,dict) and a.get('accountType') == 'liability' and a.get('code','').startswith('2100') and '-' not in a.get('code',''):
        print(a['id']); break
" 2>/dev/null)

# Fiscal year info
FISCAL_RESP=$(G "$API/api/v1/fiscal-years")
FISCAL_YEAR=$(extract_body "$FISCAL_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
fy_list = data if isinstance(data,list) else data.get('items',data.get('data',[data]))
for fy in fy_list:
    if isinstance(fy,dict) and fy.get('year'):
        for p in fy.get('periods',[]):
            if p.get('status')=='open':
                print(fy['year']); exit()
" 2>/dev/null)
FISCAL_PERIOD=$(extract_body "$FISCAL_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
fy_list = data if isinstance(data,list) else data.get('items',data.get('data',[data]))
for fy in fy_list:
    if isinstance(fy,dict) and str(fy.get('year','')) == '$FISCAL_YEAR':
        for p in fy.get('periods',[]):
            if p.get('status')=='open':
                print(p['periodNumber']); exit()
" 2>/dev/null)
OPEN_PERIOD_ID=$(extract_body "$FISCAL_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
fy_list = data if isinstance(data,list) else data.get('items',data.get('data',[data]))
for fy in fy_list:
    if isinstance(fy,dict) and str(fy.get('year','')) == '$FISCAL_YEAR':
        for p in fy.get('periods',[]):
            if p.get('status')=='open':
                print(p['id']); exit()
" 2>/dev/null)
CLOSED_YEAR=$(extract_body "$FISCAL_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
fy_list = data if isinstance(data,list) else data.get('items',data.get('data',[data]))
for fy in fy_list:
    if isinstance(fy,dict):
        for p in fy.get('periods',[]):
            if p.get('status')=='closed':
                print(fy['year']); exit()
" 2>/dev/null)
CLOSED_PERIOD_NUM=$(extract_body "$FISCAL_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
fy_list = data if isinstance(data,list) else data.get('items',data.get('data',[data]))
for fy in fy_list:
    if isinstance(fy,dict):
        for p in fy.get('periods',[]):
            if p.get('status')=='closed':
                print(p['periodNumber']); exit()
" 2>/dev/null)

# Employees
EMP_RESP=$(G "$API/api/v1/employees?limit=5")
EMP_ID=$(extract_body "$EMP_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
items = data if isinstance(data,list) else data.get('items',data.get('data',[]))
for e in items:
    if isinstance(e,dict) and e.get('status') == 'active':
        print(e['id']); break
" 2>/dev/null)

echo "=== Setup ==="
echo "Customer: $CUST_ID"
echo "AP Vendor: $AP_VENDOR_ID"
echo "Expense account: $EXPENSE_ACCT"
echo "Revenue account: $REVENUE_ACCT"
echo "AR account: $AR_ACCT"
echo "AP account: $AP_ACCT"
echo "Fiscal year: $FISCAL_YEAR, period: $FISCAL_PERIOD, period_id: $OPEN_PERIOD_ID"
echo "Closed year: $CLOSED_YEAR, closed period: $CLOSED_PERIOD_NUM"
echo "Employee: $EMP_ID"
echo ""

# ===========================================================================
# QUOTATION FLOW
# ===========================================================================
echo "=== QUOTATION FLOW ==="

R=$(POST "$API/api/v1/quotations" -d "{
  \"customerId\":\"$CUST_ID\",
  \"customerName\":\"Test Customer\",
  \"subject\":\"Test Quotation\",
  \"validUntil\":\"2026-12-31\",
  \"lines\":[{\"description\":\"Widget\",\"quantity\":2,\"unitPriceSatang\":\"10000\"}]
}")
QT_STATUS=$(extract_field "$R" "status")
QT_ID=$(extract_field "$R" "id")
check_status "Quotation: create returns status=draft" "draft" "$QT_STATUS"

R=$(NOPOST "$API/api/v1/quotations/$QT_ID/send")
QT_STATUS=$(extract_field "$R" "status")
check_status "Quotation: send returns status=sent" "sent" "$QT_STATUS"

R=$(NOPOST "$API/api/v1/quotations/$QT_ID/approve")
QT_STATUS=$(extract_field "$R" "status")
check_status "Quotation: approve returns status=approved" "approved" "$QT_STATUS"

R=$(NOPOST "$API/api/v1/quotations/$QT_ID/convert")
HTTP=$(extract_code "$R")
QT_STATUS=$(extract_body "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('quotation',{}).get('status',''))" 2>/dev/null)
INV_FROM_QT=$(extract_body "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('invoiceId',''))" 2>/dev/null)
check_status "Quotation: convert returns quotation.status=converted (Bug 1 verify)" "converted" "$QT_STATUS"
check_http "Quotation: convert returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

# --- create → send → reject ---
R=$(POST "$API/api/v1/quotations" -d "{
  \"customerId\":\"$CUST_ID\",
  \"customerName\":\"Test Customer\",
  \"subject\":\"Reject Test\",
  \"validUntil\":\"2026-12-31\",
  \"lines\":[{\"description\":\"Item\",\"quantity\":1,\"unitPriceSatang\":\"5000\"}]
}")
QT2_ID=$(extract_field "$R" "id")
R=$(NOPOST "$API/api/v1/quotations/$QT2_ID/send")
R=$(POST "$API/api/v1/quotations/$QT2_ID/reject" -d '{"reason":"Price too high"}')
QT_STATUS=$(extract_field "$R" "status")
check_status "Quotation: reject returns status=rejected" "rejected" "$QT_STATUS"

# --- create → duplicate ---
R=$(NOPOST "$API/api/v1/quotations/$QT2_ID/duplicate")
DUP_STATUS=$(extract_field "$R" "status")
check_status "Quotation: duplicate returns status=draft" "draft" "$DUP_STATUS"

# ===========================================================================
# SALES ORDER FLOW
# ===========================================================================
echo ""
echo "=== SALES ORDER FLOW ==="

R=$(POST "$API/api/v1/sales-orders" -d "{
  \"customerId\":\"$CUST_ID\",
  \"customerName\":\"Test Customer\",
  \"orderDate\":\"2026-03-16\",
  \"expectedDeliveryDate\":\"2026-03-30\",
  \"lines\":[{\"description\":\"Product A\",\"quantity\":5,\"unitPriceSatang\":\"20000\"}]
}")
SO_STATUS=$(extract_field "$R" "status")
SO_ID=$(extract_field "$R" "id")
SO_LINE_ID=$(extract_body "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); lines=d.get('lines',[]); print(lines[0]['id'] if lines else '')" 2>/dev/null)
check_status "Sales Order: create returns status=draft" "draft" "$SO_STATUS"

R=$(NOPOST "$API/api/v1/sales-orders/$SO_ID/confirm")
SO_STATUS=$(extract_field "$R" "status")
check_status "Sales Order: confirm returns status=confirmed" "confirmed" "$SO_STATUS"

# ===========================================================================
# DELIVERY NOTE FLOW
# ===========================================================================
echo ""
echo "=== DELIVERY NOTE FLOW ==="

# SO line from the confirmed SO above (need fresh line ID)
# Let's get the actual SO lines from the DB
SO_LINES_RESP=$(G "$API/api/v1/sales-orders/$SO_ID")
SO_LINE_ID=$(extract_body "$SO_LINES_RESP" | python3 -c "
import sys,json
d = json.load(sys.stdin)
lines = d.get('lines', [])
if lines:
    print(lines[0].get('id',''))
" 2>/dev/null)

if [ -n "$SO_LINE_ID" ] && [ -n "$SO_ID" ]; then
  R=$(POST "$API/api/v1/delivery-notes" -d "{
    \"salesOrderId\":\"$SO_ID\",
    \"customerId\":\"$CUST_ID\",
    \"customerName\":\"Test Customer\",
    \"deliveryDate\":\"2026-03-20\",
    \"lines\":[{
      \"salesOrderLineId\":\"$SO_LINE_ID\",
      \"description\":\"Product A\",
      \"quantityDelivered\":3
    }]
  }")
  DN_STATUS=$(extract_field "$R" "status")
  DN_ID=$(extract_field "$R" "id")
  HTTP_DN=$(extract_code "$R")
  check_http "Delivery Note: create from confirmed SO returns HTTP 201" "201" "$HTTP_DN" "$(extract_body "$R")"

  R=$(NOPOST "$API/api/v1/delivery-notes/$DN_ID/deliver")
  DN_STATUS=$(extract_field "$R" "status")
  check_status "Delivery Note: deliver returns status=delivered" "delivered" "$DN_STATUS"
else
  fail "Delivery Note: create from SO" "no SO line ID available"
  fail "Delivery Note: deliver" "no delivery note created"
fi

# ===========================================================================
# INVOICE FLOW
# ===========================================================================
echo ""
echo "=== INVOICE FLOW ==="

R=$(POST "$API/api/v1/invoices" -d "{
  \"customerId\":\"$CUST_ID\",
  \"dueDate\":\"2026-04-30\",
  \"lines\":[{\"description\":\"Service\",\"quantity\":1,\"unitPriceSatang\":\"50000\",\"accountId\":\"$REVENUE_ACCT\"}]
}")
INV_STATUS=$(extract_field "$R" "status")
INV_ID=$(extract_field "$R" "id")
check_status "Invoice: create returns status=draft" "draft" "$INV_STATUS"

R=$(NOPOST "$API/api/v1/invoices/$INV_ID/post")
INV_STATUS=$(extract_field "$R" "status")
check_status "Invoice: post returns status=posted" "posted" "$INV_STATUS"

# void a posted invoice (Bug 2 fix test)
R=$(NOPOST "$API/api/v1/invoices/$INV_ID/void")
HTTP=$(extract_code "$R")
INV_STATUS=$(extract_field "$R" "status")
check_http "Invoice: void posted invoice returns HTTP 200 (Bug 2 fix)" "200" "$HTTP" "$(extract_body "$R")"
check_status "Invoice: void posted invoice returns status=void" "void" "$INV_STATUS"

# New invoice for payment flow
R=$(POST "$API/api/v1/invoices" -d "{
  \"customerId\":\"$CUST_ID\",
  \"dueDate\":\"2026-04-30\",
  \"lines\":[{\"description\":\"Consulting\",\"quantity\":1,\"unitPriceSatang\":\"100000\",\"accountId\":\"$REVENUE_ACCT\"}]
}")
INV2_ID=$(extract_field "$R" "id")
R=$(NOPOST "$API/api/v1/invoices/$INV2_ID/post")
check_status "Invoice: post second invoice returns status=posted" "posted" "$(extract_field "$R" "status")"

# Receive payment via /api/v1/payments
R=$(POST "$API/api/v1/payments" -d "{
  \"customerId\":\"$CUST_ID\",
  \"amountSatang\":\"100000\",
  \"paymentDate\":\"2026-03-16\",
  \"paymentMethod\":\"bank_transfer\",
  \"invoiceId\":\"$INV2_ID\"
}")
HTTP=$(extract_code "$R")
PMT_ID=$(extract_field "$R" "id")
check_http "Invoice: receive payment returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

# ===========================================================================
# BILL FLOW
# ===========================================================================
echo ""
echo "=== BILL FLOW ==="

R=$(POST "$API/api/v1/bills" -d "{
  \"vendorId\":\"$AP_VENDOR_ID\",
  \"dueDate\":\"2026-04-30\",
  \"lines\":[{\"description\":\"Office supplies\",\"amountSatang\":\"30000\",\"accountId\":\"$EXPENSE_ACCT\"}]
}")
BILL_STATUS=$(extract_field "$R" "status")
BILL_ID=$(extract_field "$R" "id")
check_status "Bill: create returns status=draft" "draft" "$BILL_STATUS"

R=$(NOPOST "$API/api/v1/bills/$BILL_ID/post")
BILL_STATUS=$(extract_field "$R" "status")
check_status "Bill: post returns status=posted" "posted" "$BILL_STATUS"

# Bill payment
R=$(POST "$API/api/v1/bill-payments" -d "{
  \"billId\":\"$BILL_ID\",
  \"amountSatang\":\"30000\",
  \"paymentDate\":\"2026-03-16\",
  \"paymentMethod\":\"bank_transfer\"
}")
HTTP=$(extract_code "$R")
BILL_PMT_STATUS=$(extract_body "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('billStatus',''))" 2>/dev/null)
check_http "Bill: pay (bill-payment) returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

# New bill for void test
R=$(POST "$API/api/v1/bills" -d "{
  \"vendorId\":\"$AP_VENDOR_ID\",
  \"dueDate\":\"2026-04-30\",
  \"lines\":[{\"description\":\"Utilities\",\"amountSatang\":\"15000\",\"accountId\":\"$EXPENSE_ACCT\"}]
}")
BILL2_ID=$(extract_field "$R" "id")
R=$(NOPOST "$API/api/v1/bills/$BILL2_ID/post")
check_status "Bill: post second bill returns status=posted" "posted" "$(extract_field "$R" "status")"

R=$(NOPOST "$API/api/v1/bills/$BILL2_ID/void")
HTTP=$(extract_code "$R")
BILL2_STATUS=$(extract_field "$R" "status")
check_http "Bill: void returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
check_status "Bill: void returns status=voided" "voided" "$BILL2_STATUS"

# ===========================================================================
# PURCHASE ORDER FLOW
# ===========================================================================
echo ""
echo "=== PURCHASE ORDER FLOW ==="

R=$(POST "$API/api/v1/purchase-orders" -d "{
  \"vendorId\":\"$AP_VENDOR_ID\",
  \"orderDate\":\"2026-03-16\",
  \"expectedDate\":\"2026-03-30\",
  \"lines\":[{\"description\":\"Office Chair\",\"quantity\":2,\"unitPriceSatang\":\"500000\"}]
}")
PO_STATUS=$(extract_field "$R" "status")
PO_ID=$(extract_field "$R" "id")
check_status "Purchase Order: create returns status=draft" "draft" "$PO_STATUS"

R=$(NOPOST "$API/api/v1/purchase-orders/$PO_ID/send")
PO_STATUS=$(extract_field "$R" "status")
check_status "Purchase Order: send returns status=sent" "sent" "$PO_STATUS"

# Get the PO line IDs to use for receive
PO_DETAIL=$(G "$API/api/v1/purchase-orders/$PO_ID")
PO_LINE_ID=$(extract_body "$PO_DETAIL" | python3 -c "
import sys,json
d = json.load(sys.stdin)
lines = d.get('lines',[])
print(lines[0]['id'] if lines else '')
" 2>/dev/null)

R=$(POST "$API/api/v1/purchase-orders/$PO_ID/receive" -d "{
  \"lines\":[{\"lineId\":\"$PO_LINE_ID\",\"quantityReceived\":2}]
}")
HTTP_PO=$(extract_code "$R")
PO_STATUS=$(extract_field "$R" "status")
if [ "$HTTP_PO" = "200" ]; then
  pass "Purchase Order: receive returns HTTP 200"
else
  fail "Purchase Order: receive returns HTTP 200" "got $HTTP_PO — $(extract_body "$R")"
fi

R=$(NOPOST "$API/api/v1/purchase-orders/$PO_ID/convert-to-bill")
HTTP=$(extract_code "$R")
PO_BILL_ID=$(extract_body "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('billId',''))" 2>/dev/null)
check_http "Purchase Order: convert-to-bill returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

# ===========================================================================
# RECEIPT FLOW
# ===========================================================================
echo ""
echo "=== RECEIPT FLOW ==="

R=$(POST "$API/api/v1/receipts" -d "{
  \"customerId\":\"$CUST_ID\",
  \"customerName\":\"Test Customer\",
  \"amountSatang\":\"25000\",
  \"receiptDate\":\"2026-03-16\",
  \"paymentMethod\":\"cash\"
}")
HTTP=$(extract_code "$R")
RECEIPT_STATUS=$(extract_field "$R" "status")
RECEIPT_ID=$(extract_field "$R" "id")
check_http "Receipt: create (issued) returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

R=$(NOPOST "$API/api/v1/receipts/$RECEIPT_ID/void")
HTTP=$(extract_code "$R")
RECEIPT_VOID_STATUS=$(extract_field "$R" "status")
check_http "Receipt: void returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
check_status "Receipt: void returns status=voided" "voided" "$RECEIPT_VOID_STATUS"

# ===========================================================================
# CREDIT NOTE FLOW
# ===========================================================================
echo ""
echo "=== CREDIT NOTE FLOW ==="

# Create and post an invoice to reference
R=$(POST "$API/api/v1/invoices" -d "{
  \"customerId\":\"$CUST_ID\",
  \"dueDate\":\"2026-04-30\",
  \"lines\":[{\"description\":\"Product for CN\",\"quantity\":1,\"unitPriceSatang\":\"20000\",\"accountId\":\"$REVENUE_ACCT\"}]
}")
CN_INV_ID=$(extract_field "$R" "id")
NOPOST "$API/api/v1/invoices/$CN_INV_ID/post" > /dev/null

R=$(POST "$API/api/v1/credit-notes" -d "{
  \"invoiceId\":\"$CN_INV_ID\",
  \"customerId\":\"$CUST_ID\",
  \"customerName\":\"Test Customer\",
  \"reason\":\"Return of goods\",
  \"lines\":[{\"description\":\"Product returned\",\"quantity\":1,\"unitPriceSatang\":\"20000\",\"accountId\":\"$REVENUE_ACCT\"}]
}")
HTTP=$(extract_code "$R")
CN_STATUS=$(extract_field "$R" "status")
CN_ID=$(extract_field "$R" "id")
check_http "Credit Note: create (draft) returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

R=$(NOPOST "$API/api/v1/credit-notes/$CN_ID/issue")
HTTP=$(extract_code "$R")
CN_STATUS=$(extract_field "$R" "status")
check_http "Credit Note: issue returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
check_status "Credit Note: issue returns status=issued" "issued" "$CN_STATUS"

# ===========================================================================
# JOURNAL ENTRY FLOW
# ===========================================================================
echo ""
echo "=== JOURNAL ENTRY FLOW ==="

if [ -z "$FISCAL_YEAR" ] || [ -z "$FISCAL_PERIOD" ]; then
  FISCAL_YEAR=2031; FISCAL_PERIOD=1
fi

R=$(POST "$API/api/v1/journal-entries" -d "{
  \"description\":\"Test JE\",
  \"fiscalYear\":$FISCAL_YEAR,
  \"fiscalPeriod\":$FISCAL_PERIOD,
  \"lines\":[
    {\"accountId\":\"$AR_ACCT\",\"description\":\"Dr AR\",\"debitSatang\":\"10000\",\"creditSatang\":\"0\"},
    {\"accountId\":\"$REVENUE_ACCT\",\"description\":\"Cr Revenue\",\"debitSatang\":\"0\",\"creditSatang\":\"10000\"}
  ]
}")
JE_STATUS=$(extract_field "$R" "status")
JE_ID=$(extract_field "$R" "id")
check_status "Journal Entry: create returns status=draft" "draft" "$JE_STATUS"

R=$(NOPOST "$API/api/v1/journal-entries/$JE_ID/post")
JE_STATUS=$(extract_field "$R" "status")
check_status "Journal Entry: post returns status=posted" "posted" "$JE_STATUS"

R=$(NOPOST "$API/api/v1/journal-entries/$JE_ID/reverse")
HTTP=$(extract_code "$R")
check_http "Journal Entry: reverse returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

# JE in closed period should be blocked (409)
if [ -n "$CLOSED_YEAR" ] && [ -n "$CLOSED_PERIOD_NUM" ]; then
  R=$(POST "$API/api/v1/journal-entries" -d "{
    \"description\":\"Should be blocked\",
    \"fiscalYear\":$CLOSED_YEAR,
    \"fiscalPeriod\":$CLOSED_PERIOD_NUM,
    \"lines\":[
      {\"accountId\":\"$AR_ACCT\",\"description\":\"Dr\",\"debitSatang\":\"5000\",\"creditSatang\":\"0\"},
      {\"accountId\":\"$REVENUE_ACCT\",\"description\":\"Cr\",\"debitSatang\":\"0\",\"creditSatang\":\"5000\"}
    ]
  }")
  HTTP=$(extract_code "$R")
  if [ "$HTTP" = "409" ] || [ "$HTTP" = "400" ]; then
    pass "Journal Entry: create in closed period is blocked (HTTP $HTTP)"
  else
    fail "Journal Entry: create in closed period should be blocked" "got HTTP $HTTP — $(extract_body "$R")"
  fi
else
  echo "[SKIP] Journal Entry: closed period test — no closed period found"
fi

# ===========================================================================
# EMPLOYEE LIFECYCLE
# ===========================================================================
echo ""
echo "=== EMPLOYEE LIFECYCLE ==="

DEPT_RESP=$(G "$API/api/v1/departments?limit=1")
DEPT_ID=$(extract_body "$DEPT_RESP" | python3 -c "
import sys,json
data = json.load(sys.stdin)
items = data if isinstance(data,list) else data.get('items',data.get('data',[]))
print(items[0]['id'] if items else '')
" 2>/dev/null)

R=$(POST "$API/api/v1/employees" -d "{
  \"employeeCode\":\"EMP-TEST-$(date +%s)\",
  \"firstNameTh\":\"ทดสอบ\",
  \"lastNameTh\":\"พนักงาน\",
  \"firstNameEn\":\"Test\",
  \"lastNameEn\":\"Employee\",
  \"departmentId\":\"$DEPT_ID\",
  \"position\":\"Tester\",
  \"hireDate\":\"2026-01-01\",
  \"salarySatang\":5000000
}")
HTTP=$(extract_code "$R")
NEW_EMP_ID=$(extract_field "$R" "id")
check_http "Employee: create returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

# Edit employee
R=$(PUT "$API/api/v1/employees/$NEW_EMP_ID" -d '{"position":"Senior Tester"}')
HTTP=$(extract_code "$R")
check_http "Employee: edit returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"

# Resign
R=$(POST "$API/api/v1/employees/$NEW_EMP_ID/resign" -d '{"resignationDate":"2026-12-31","notes":"Moving on"}')
HTTP=$(extract_code "$R")
EMP_STATUS=$(extract_field "$R" "status")
check_http "Employee: resign returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
check_status "Employee: resign returns status=resigned" "resigned" "$EMP_STATUS"

# Anonymize
R=$(NOPOST "$API/api/v1/employees/$NEW_EMP_ID/anonymize")
HTTP=$(extract_code "$R")
EMP_STATUS=$(extract_field "$R" "status")
check_http "Employee: anonymize returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
check_status "Employee: anonymize returns status=anonymized" "anonymized" "$EMP_STATUS"

# ===========================================================================
# PAYROLL FLOW
# ===========================================================================
echo ""
echo "=== PAYROLL FLOW ==="

R=$(POST "$API/api/v1/payroll" -d "{
  \"payPeriodStart\":\"2026-03-01\",
  \"payPeriodEnd\":\"2026-03-31\",
  \"runDate\":\"2026-03-31\"
}")
HTTP=$(extract_code "$R")
PAY_ID=$(extract_field "$R" "id")
check_http "Payroll: create returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

R=$(NOPOST "$API/api/v1/payroll/$PAY_ID/calculate")
HTTP=$(extract_code "$R")
check_http "Payroll: calculate returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"

R=$(NOPOST "$API/api/v1/payroll/$PAY_ID/approve")
HTTP=$(extract_code "$R")
PAY_STATUS=$(extract_field "$R" "status")
check_http "Payroll: approve returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
check_status "Payroll: approve returns status=approved" "approved" "$PAY_STATUS"

R=$(NOPOST "$API/api/v1/payroll/$PAY_ID/pay")
HTTP=$(extract_code "$R")
PAY_STATUS=$(extract_field "$R" "status")
check_http "Payroll: pay returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
check_status "Payroll: pay returns status=paid" "paid" "$PAY_STATUS"

# ===========================================================================
# LEAVE FLOW
# ===========================================================================
echo ""
echo "=== LEAVE FLOW ==="

R=$(POST "$API/api/v1/leave-types" -d "{
  \"code\":\"TEST-LV-$(date +%s)\",
  \"nameTh\":\"ลาทดสอบ\",
  \"nameEn\":\"Test Leave\",
  \"annualQuotaDays\":10,
  \"isPaid\":true
}")
HTTP=$(extract_code "$R")
LEAVE_TYPE_ID=$(extract_field "$R" "id")
check_http "Leave: create type returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

# Use the newly created employee (NEW_EMP_ID) — but it was anonymized. Use EMP_ID with far-future dates.
# Generate unique dates using current timestamp to avoid conflicts
TS=$(date +%s)
# Use dates far in the future based on timestamp to avoid overlap
LV_YEAR=$(( 2030 + (TS % 10) ))
LV_MONTH=$(printf "%02d" $(( (TS % 12) + 1 )))

if [ -n "$EMP_ID" ] && [ -n "$LEAVE_TYPE_ID" ]; then
  R=$(POST "$API/api/v1/leave-requests" -d "{
    \"employeeId\":\"$EMP_ID\",
    \"leaveTypeId\":\"$LEAVE_TYPE_ID\",
    \"startDate\":\"${LV_YEAR}-${LV_MONTH}-05\",
    \"endDate\":\"${LV_YEAR}-${LV_MONTH}-06\",
    \"reason\":\"Personal\"
  }")
  HTTP=$(extract_code "$R")
  LR_ID=$(extract_field "$R" "id")
  check_http "Leave: create request returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

  R=$(NOPOST "$API/api/v1/leave-requests/$LR_ID/approve")
  HTTP=$(extract_code "$R")
  LR_STATUS=$(extract_field "$R" "status")
  check_http "Leave: approve request returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
  check_status "Leave: approve returns status=approved" "approved" "$LR_STATUS"

  # Create another leave request + reject (different days)
  R=$(POST "$API/api/v1/leave-requests" -d "{
    \"employeeId\":\"$EMP_ID\",
    \"leaveTypeId\":\"$LEAVE_TYPE_ID\",
    \"startDate\":\"${LV_YEAR}-${LV_MONTH}-20\",
    \"endDate\":\"${LV_YEAR}-${LV_MONTH}-20\",
    \"reason\":\"Sick\"
  }")
  LR2_ID=$(extract_field "$R" "id")

  R=$(POST "$API/api/v1/leave-requests/$LR2_ID/reject" -d '{"reason":"Insufficient notice"}')
  HTTP=$(extract_code "$R")
  LR2_STATUS=$(extract_field "$R" "status")
  check_http "Leave: reject request returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
  check_status "Leave: reject returns status=rejected" "rejected" "$LR2_STATUS"
else
  fail "Leave: create request" "no active employee or leave type available"
  fail "Leave: approve request" "dependency missing"
  fail "Leave: reject request" "dependency missing"
fi

# ===========================================================================
# MONTH-END FLOW
# ===========================================================================
echo ""
echo "=== MONTH-END FLOW ==="

FISCAL_RESP3=$(G "$API/api/v1/fiscal-years")
PERIOD_INFO=$(extract_body "$FISCAL_RESP3" | python3 -c "
import sys,json
data = json.load(sys.stdin)
fy_list = data if isinstance(data,list) else data.get('items',data.get('data',[data]))
for fy in fy_list:
    if isinstance(fy,dict):
        for p in fy.get('periods',[]):
            if p.get('status')=='open':
                print(fy['year'],p['periodNumber'],p['id'])
                exit()
" 2>/dev/null)
ME_YEAR=$(echo $PERIOD_INFO | awk '{print $1}')
ME_PERIOD_NUM=$(echo $PERIOD_INFO | awk '{print $2}')
ME_PERIOD_ID=$(echo $PERIOD_INFO | awk '{print $3}')

if [ -n "$ME_PERIOD_ID" ]; then
  R=$(NOPOST "$API/api/v1/fiscal-periods/$ME_PERIOD_ID/close")
  HTTP=$(extract_code "$R")
  PERIOD_STATUS=$(extract_field "$R" "status")
  check_http "Month-End: close period returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
  check_status "Month-End: close period returns status=closed" "closed" "$PERIOD_STATUS"

  # Verify JE is blocked in closed period
  R=$(POST "$API/api/v1/journal-entries" -d "{
    \"description\":\"Should be blocked after close\",
    \"fiscalYear\":$ME_YEAR,
    \"fiscalPeriod\":$ME_PERIOD_NUM,
    \"lines\":[
      {\"accountId\":\"$AR_ACCT\",\"description\":\"Dr\",\"debitSatang\":\"5000\",\"creditSatang\":\"0\"},
      {\"accountId\":\"$REVENUE_ACCT\",\"description\":\"Cr\",\"debitSatang\":\"0\",\"creditSatang\":\"5000\"}
    ]
  }")
  HTTP=$(extract_code "$R")
  if [ "$HTTP" = "409" ] || [ "$HTTP" = "400" ]; then
    pass "Month-End: JE blocked in closed period (HTTP $HTTP)"
  else
    fail "Month-End: JE blocked in closed period" "expected 409/400 got HTTP $HTTP"
  fi

  # Reopen period
  R=$(NOPOST "$API/api/v1/fiscal-periods/$ME_PERIOD_ID/reopen")
  HTTP=$(extract_code "$R")
  PERIOD_STATUS=$(extract_field "$R" "status")
  check_http "Month-End: reopen period returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"
  check_status "Month-End: reopen period returns status=open" "open" "$PERIOD_STATUS"
else
  fail "Month-End: close period" "no open fiscal period found"
  fail "Month-End: JE blocked in closed period" "no period closed"
  fail "Month-End: reopen period" "no period to reopen"
fi

# ===========================================================================
# FIXED ASSET FLOW
# ===========================================================================
echo ""
echo "=== FIXED ASSET FLOW ==="

R=$(POST "$API/api/v1/fixed-assets" -d "{
  \"assetCode\":\"FA-TEST-$(date +%s)\",
  \"nameTh\":\"เครื่องทดสอบ\",
  \"nameEn\":\"Test Machine\",
  \"category\":\"equipment\",
  \"purchaseDate\":\"2026-01-01\",
  \"purchaseCostSatang\":\"1000000\",
  \"usefulLifeMonths\":60,
  \"depreciationMethod\":\"straight_line\"
}")
HTTP=$(extract_code "$R")
FA_ID=$(extract_field "$R" "id")
check_http "Fixed Asset: create returns HTTP 201" "201" "$HTTP" "$(extract_body "$R")"

# Depreciate — body only accepts optional periodDate
R=$(POST "$API/api/v1/fixed-assets/$FA_ID/depreciate" -d "{
  \"periodDate\":\"2026-02-28\"
}")
HTTP=$(extract_code "$R")
check_http "Fixed Asset: depreciate returns HTTP 200" "200" "$HTTP" "$(extract_body "$R")"

# ===========================================================================
# SUMMARY
# ===========================================================================
echo ""
echo "==============================="
echo "TOTAL: $((PASS+FAIL)) | PASS: $PASS | FAIL: $FAIL"
echo "==============================="
