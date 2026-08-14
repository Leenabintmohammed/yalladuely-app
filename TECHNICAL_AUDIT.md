# Duely Technical Architecture Audit
**Date:** 2026-08-12  
**Status:** MVP v1 - Production-Oriented Financial Application  
**Assessment:** Mixed - Strong financial core with solid architecture, but significant MVP limitations and missing test coverage

---

## A. CURRENT ARCHITECTURE

### A.1 Repository Structure
```
yalladuely-app/
├── src/
│   ├── lib/
│   │   ├── finance-core.ts       (Pure financial calculations)
│   │   ├── finance.server.ts     (Finance engine with DB ops)
│   │   ├── duely-orchestrator.server.ts (AI orchestrator)
│   │   ├── duely-tools.server.ts (AI tool implementations)
│   │   ├── ai-provider.server.ts (AI model selection)
│   │   ├── error-capture.ts      (Error handling)
│   │   └── [other utilities]
│   ├── components/               (React UI - Shadcn/Radix)
│   ├── routes/                   (TanStack routing)
│   └── integrations/supabase/    (Auth & DB client)
├── supabase/
│   ├── config.toml
│   └── migrations/               (4 SQL migration files)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### A.2 Frontend Architecture
- **Framework:** React 19 + TanStack Router (v1.170)
- **Styling:** Tailwind CSS + Shadcn/Radix UI components
- **State Management:** React Query (TanStack Query v5)
- **Build Tool:** Vite + TanStack Start (SSR)
- **Language:** TypeScript (strict mode)

**Key Frontend Components:**
- `src/routes/__root.tsx` - Root layout with error boundaries
- `src/routes/auth.tsx` - Email/password authentication UI
- `src/routes/_authenticated/dashboard.tsx` - Cash position overview
- `src/routes/_authenticated/invoices.tsx`, `payments.tsx`, etc. - Domain pages
- `src/lib/duely-context.tsx` - Global Duely state (AI modal, current page)
- `src/lib/queries.ts` - React Query hooks for data fetching

**Security Note:** All authenticated routes protected by server middleware; token validation at `src/integrations/supabase/auth-middleware.ts`

### A.3 Backend Architecture
- **Framework:** TanStack Start with Nitro (SSR + server functions)
- **Database:** Supabase (PostgreSQL 15+)
- **Authentication:** Supabase Auth (JWT tokens, RLS)
- **AI Integration:** Lovable AI gateway (Gemini models)
- **API Pattern:** Server functions (`createServerFn`) for RPC-style endpoints

**Key Server Entry Points:**
- `src/server.ts` - Main server entry with error wrapping
- `src/start.ts` - TanStack Start initialization
- `src/lib/ai.functions.ts` - `duelyChat` and `resolveAction` server functions
- `src/integrations/supabase/auth-middleware.ts` - Auth token validation

### A.4 Database Schema (4 Migrations)
**Core Tables:**
1. `profiles` - User account info (onboarded, currency, language preferences)
2. `clients` - Customers (name, email, billing address, status, notes)
3. `invoices` - Invoice documents with amounts, totals, tax, discount
4. `invoice_items` - Line items (quantity, unit_price, line_total)
5. `payments` - Payment records (amount, date, method, idempotency_key, reversed_at)
6. `reminders` - Email/SMS reminder templates (draft/sent status)
7. `company_policies` - Company-wide settings (JSONB)
8. `client_memory` - AI memory per client (memory_type, memory_value, confidence)
9. `payment_plans` - Installment arrangements (total_amount, currency, status)
10. `payment_plan_installments` - Individual installments (due_date, paid_amount, status)
11. `ai_conversations` - Chat history (role, message, context)
12. `ai_actions` - AI tool execution audit (tool_name, parameters, status, result)
13. `audit_logs` - Financial operation audit trail (before_state, after_state)
14. `notifications` - Event notifications (dedupe_key for idempotency)
15. `reminders` - Reminder records

**RLS Policies:** All tables enforce `owner_id` scoping - authenticated users can only access their own data.

### A.5 Finance Core Architecture (`finance-core.ts`)
**Pure Mathematical Functions (no I/O):**
- `computeInvoiceTotals()` - Subtotal → Discount → Tax → Total
- `canTransitionInvoice()` - State machine validator
- `deriveInvoiceStatus()` - Derive status from paid amount + due date
- `splitInstallments()` - Evenly split total across N installments (no penny loss)
- `allocatePlanPayments()` - Allocate unlinked payments to installments (oldest first)
- `derivePlanStatus()` - Auto-detect plan risk level
- `scoreRisk()` - Risk scoring algorithm (0-100)

**Key Invariants:**
- All money values use `round2()` (half-up rounding to 2 decimals)
- Discount capped at subtotal
- Tax applied after discount
- Invoice status transitions validated (state machine)
- Payment allocation is deterministic

### A.6 Finance Server Engine (`finance.server.ts`)
**Authoritative Financial Operations:**
1. `recalcInvoice()` - Recompute invoice status from live payments
2. `recalcInvoiceTotals()` - Recompute line totals and tax
3. `recordPayment()` - Only supported way to record money in
4. `reversePayment()` - Never deletes, marks with `reversed_at`
5. `createPaymentPlan()` - Create installment arrangement
6. `recalcPlan()` - Recompute plan state from installment payments
7. `setPlanStatus()` - Explicit status transitions (paused, cancelled)
8. `clientRisk()` - Calculate risk score per client
9. `audit()` - Log before/after state of financial operations

**Critical Pattern:** All financial mutations flow through these functions; no direct DB writes allowed for money operations.

### A.7 AI Integration Architecture
**Three-Tier System:**

**Tier 1: Orchestrator** (`duely-orchestrator.server.ts`)
- Receives user message + context (current page, focused invoice, selected items, policies, client memory)
- Builds AI prompt with financial snapshot, unread notifications, at-risk clients
- Calls LLM with tool definitions
- Handles tool execution loop (recursive tool calling)
- Returns `ChatResult` with reply, pending actions (awaiting approval), and performed actions

**Tier 2: Tool Autonomy** (`TOOL_AUTONOMY` in duely-tools.server.ts)
- 3 levels: `"auto"` (execute immediately), `"approval_required"` (create action card), `"human_only"` (reject)
- Tools requiring approval: send_invoice, send_reminder, create_payment_plan, reverse_payment, etc.
- Tools marked human_only: write_off_invoice, delete_client, delete_invoice

**Tier 3: Tool Execution** (`executeTool()` in duely-tools.server.ts)
- 30+ tools covering: clients, invoices, payments, payment plans, notifications, company policies, memory, audit logs
- All tool calls go through finance.server functions (never direct DB mutations for financial data)
- Results passed to AI for synthesis into reply

**AI Models:**
```typescript
DUELY_MODELS = {
  default: "google/gemini-3.6-flash",  // Fast/cheap
  reasoning: "google/gemini-3-pro-preview" // Complex
}
```
- Provider: Lovable AI gateway (OpenAI-compatible API)
- Authentication: `LOVABLE_API_KEY` environment variable
- Failover: Returns "AI is not configured yet" if key missing

### A.8 Authentication & Authorization

**Authentication Flow:**
1. User signs up/in via Supabase Auth (`auth.tsx`)
2. Supabase returns JWT token (stored in localStorage)
3. Frontend sends token in `Authorization: Bearer` header
4. Server middleware (`requireSupabaseAuth`) validates token
5. Token claims extracted: `sub` = user ID
6. Supabase client created with authenticated context

**Authorization:**
- **Server-side:** All queries filtered by `auth.uid()` via middleware
- **Database-level:** RLS policies enforce owner-scoped access
  - Example: `CREATE POLICY "own invoices" ON invoices FOR ALL USING (auth.uid() = owner_id)`
- **Application-level:** Tools verify ownership before mutation
- **Tool-level:** Some tools (write_off_invoice) hardcoded as `human_only`

**Session Management:**
- Client-side: `localStorage` (auto-refresh token)
- Server-side: No session storage; JWT validation on each request
- Logout: Clear localStorage token

**Limitations:** No multi-user collaboration, no role-based access control (RBAC), no API key authentication for integrations

### A.9 AI Approval & Action Audit Trail

**Approval Workflow:**
1. AI generates `ai_actions` record with `status: "awaiting_approval"`
2. Frontend displays approval card
3. User clicks "Approve" or "Reject"
4. Server calls `resolveAction()` which:
   - If rejected: Updates action `status: "rejected"`
   - If approved: Executes tool immediately, sets `status: "completed"` or `"failed"`
5. Action saved with `result` and `new_state` fields

**Audit Trail:**
- **ai_actions table:** Tool name, parameters, autonomy level, status, result
- **audit_logs table:** Before/after state of financial entities
- **ai_conversations table:** Chat history (role, message, context)

**Staleness Risk:** AI approvals are **NOT timestamped** - no expiration. An approval from an hour ago is as valid as one from now. **NO VERIFICATION** that underlying state hasn't changed between approval and execution.

---

## B. P0 CRITICAL RISKS

### B.1 Payment Reversal Financial Integrity Risk
**Risk:** Payment reversals DO NOT automatically restore originating invoice status.

**Finding:**
```typescript
export async function reversePayment(ctx, paymentId, reason?) {
  const updated = await ctx.supabase
    .from("payments")
    .update({ reversed_at: now(), reversal_reason: reason })
    .eq("id", paymentId);
  
  const invoice = updated.invoice_id ? await recalcInvoice(...) : null;
  // recalcInvoice() will derive NEW status from live (non-reversed) payments
}
```
If Invoice was "paid" (100% paid), payment reversal triggers `recalcInvoice()`, which recalculates based on LIVE payments (filters `!reversed_at`). Status can transition from "paid" back to "partially_paid" or "sent", which is correct.

**But:** State machine allows `paid → partially_paid`, which works. However, the **no time-based validation** means a reversal can happen at any time without audit context of why the payment existed.

**Recommendation:** Add timestamp range check in recalcInvoice; log reversal with full audit context.

### B.2 AI Action Staleness - No Expiration or Validation
**Risk:** AI approvals cached indefinitely without re-validation of current state.

**Finding:**
```typescript
// In resolveAction (duely-orchestrator.server.ts)
const { data: action } = await ctx.supabase
  .from("ai_actions")
  .select("*")
  .eq("id", data.action_id)
  .maybeSingle();
if (!action) return { status: "error", message: "action_not_found" };
if (action.status !== "awaiting_approval") return { status: "error", message: "already_resolved" };

// NO CHECK: Does `action.parameters` still match current data?
// What if invoice status changed, or client was deleted?
const result = await executeTool(action.tool_name, action.parameters, ...);
```

**Scenario:** User approves "send invoice" at 2:00 PM. Realizing mistake, invoice is manually cancelled at 2:05 PM. User finds approval card still in UI, clicks "Approve" at 2:30 PM - invoice transitions from "cancelled" back to "sent" (valid state transition, but semantically wrong).

**Missing:**
- No `expires_at` field (or it exists but unused in `ai_actions` table)
- No re-fetch of current entity state before execution
- No validation that parameters still apply

**Impact:** AI can silently execute on stale data.

**Recommendation:** 
1. Add `expires_at` (default 15 min) and enforce expiration check
2. Re-fetch entity before approval execution
3. Compare `state_hash` of entity vs. when action was created

### B.3 Missing Input Validation on Financial Amounts
**Risk:** Client-side values bypass comprehensive validation.

**Finding:**
```typescript
// duely-tools.server.ts - create_invoice
const totals = computeInvoiceTotals({
  items: rawItems?.length ? rawItems : [{ amount: num(p['amount']) }],
  discount_type: (p['discount_type'] ?? "none") as string,
  discount_value: num(p['discount_value']),
  tax_rate: num(p['tax_rate']),
});
if (!(totals.total > 0)) return fail("validation_failed", "Invoice total must be greater than zero.");
```

**Gaps:**
- No check: `discount_value > 100` for percentage discounts (only clamped in core)
- No check: `tax_rate` validity (only clamped)
- No check: Line item quantities negative (only `Math.max(0, ...)` applied)
- No check: Currency code validity
- No check: invoice_number uniqueness enforced DB-side, but no pre-check

**Recommendation:** Add Zod validation schema for all financial inputs.

### B.4 AI Can Create Financial State Without Full Validation
**Risk:** AI tools accept parameters with minimal server-side validation.

**Finding:**
```typescript
case "create_payment_plan": {
  // ... minimal validation ...
  return await createPaymentPlan(ctx, {
    total_amount: total,
    installment_count: num(p['installment_count'], 3),
    // Uses num() which silently returns 0 if undefined
  });
}
```

**Scenario:** AI receives user message "Split invoice into parts" but parameter parsing fails silently. `num(undefined, 3)` returns 3, plan created with default 3 installments instead of requested N.

**Impact:** AI actions can succeed with wrong parameters; user may not notice.

**Recommendation:** Strict parameter validation; fail fast on missing required fields.

### B.5 Payment Allocation Algorithm Non-Deterministic in Edge Cases
**Risk:** Unlinked payments allocated to installments; allocation order matters for risk scoring.

**Finding:**
```typescript
export function allocatePlanPayments(
  installments: { id, amount, due_date }[],
  directByInstallment: Record<string, number>,
  unlinkedTotal: number
) {
  // Sort by due_date
  const ordered = [...installments].sort((a, b) => a.due_date < b.due_date ? -1 : ...);
  // Allocate unlinked to oldest-due first
  for (const inst of ordered) { ... }
}
```

**Edge Case:** If two installments have same `due_date`, sort order is undefined (JavaScript sort is unstable in older engines). Allocation order could vary per execution, causing different risk scores.

**Impact:** Rare, but payment plans with same-day installments could have non-deterministic risk scoring.

**Recommendation:** Add `seq` (installment sequence) as tiebreaker in sort.

---

## C. P1 IMPORTANT ISSUES

### C.1 No Automated Test Coverage
**Finding:** Zero test files in repository. No unit tests, integration tests, or end-to-end tests.

**Critical for Finance:**
- `finance-core.ts` functions (invoice totals, risk scoring) lack unit tests
- `recordPayment()` idempotency not tested
- State machine transitions not validated automatically
- Edge cases (rounding, payment allocation) not tested

**Impact:** Regressions can silently break financial calculations.

**Recommendation:** Minimum viable test suite:
```
tests/finance-core.spec.ts - Unit tests for all math functions
tests/state-machine.spec.ts - Invoice/plan status transitions
tests/payment-idempotency.spec.ts - Duplicate payment handling
tests/risk-scoring.spec.ts - Risk calculation edge cases
```

### C.2 Invoice Totals Calculated Both in finance-core.ts and recalcInvoiceTotals()
**Finding:** Duplication of invoice calculation logic.

**Location 1 - finance-core.ts:**
```typescript
export function computeInvoiceTotals(input) {
  // ... all calculation logic ...
}
```

**Location 2 - duely-tools.server.ts (create_invoice):**
```typescript
const totals = computeInvoiceTotals({ ... }); // Uses core
await ctx.supabase.from("invoices").insert({
  amount: totals.total,
  subtotal: totals.subtotal,
  discount_type: totals.discount_type,
  tax_amount: totals.tax_amount,
  items: totals.items // Stored as JSONB
});
```

**Duplication Issue:**
- Line items can be stored as JSONB in `invoices.items` OR as rows in `invoice_items` table
- `recalcInvoiceTotals()` tries both: if `invoice_items` rows exist, use them; else use `invoices.items`
- Creates maintenance burden; risk of divergence

**Recommendation:** Normalize: Always use `invoice_items` table; deprecate `invoices.items` JSONB.

### C.3 Overdue Invoice Detection Relies on Daily Cron, Not Real-Time
**Finding:**
```typescript
export async function refreshOverdueInvoices(ctx) {
  const { data } = await ctx.supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("owner_id", ctx.userId)
    .lt("due_date", todayISO())
    .in("status", ["sent", "viewed", "partially_paid"])
    .select("id");
  return { transitioned: (data ?? []).length };
}
```

**Issue:**
- Called on each dashboard load and AI chat (via `buildContext()` in orchestrator)
- Status NOT automatically updated at midnight
- Invoice could show "sent" at 11:59 PM, then "overdue" at 12:01 AM (if user refreshes)
- No server-side scheduler to trigger batch status updates

**Impact:** Notifications generated ONLY when user visits page (lazy evaluation).

**Recommendation:** 
1. Add daily scheduled job (via Supabase Edge Functions or external cron)
2. Update all invoices with due_date < today at 00:01 UTC
3. Trigger notifications via push/email

### C.4 Notifications Deduplicated but Not Cleaned Up
**Finding:**
```typescript
async function pushNotification(ctx, row: { dedupe_key, ... }) {
  await ctx.supabase
    .from("notifications")
    .upsert({ owner_id: ctx.userId, ...row }, { onConflict: "owner_id,dedupe_key" });
}
```

**Issue:**
- Unique constraint on `(owner_id, dedupe_key)` prevents duplicates
- But notifications are **never archived or deleted**
- Over time, table grows unbounded
- UI shows only 50 unread; doesn't paginate old notifications

**Impact:** 
- Database bloat
- Archival/compliance concerns (EU GDPR right to erasure)

**Recommendation:** Add TTL (time-to-live) of 90 days; clean up old read notifications weekly.

### C.5 Client Memory Confidence Stored but Never Used
**Finding:**
```typescript
// finance.server.ts - recordPayment()
await ctx.supabase.from("client_memory").upsert({
  confidence: 1, // Always 1.0 (100%)
  ...
});

// duely-tools.server.ts - save_memory
const { confidence } = p;  // Accepts from AI
```

**Issue:**
- `client_memory.confidence` (numeric 0-1) stored in DB
- Never used to weight risk scoring
- AI can set confidence, but system ignores it

**Impact:** Stale or low-confidence memories given same weight as recent high-confidence data.

**Recommendation:** Use confidence in `scoreRisk()`:
```typescript
// Weight delays by confidence
const weighted = delays.map((d, i) => d * (memories[i].confidence ?? 1.0));
```

### C.6 Company Policies Stored as JSONB, No Schema Validation
**Finding:**
```typescript
case "update_company_policy": {
  const key = String(p['policy_key'] ?? "");
  const value = p['policy_value'] ?? null;
  const { data, error } = await ctx.supabase
    .from("company_policies")
    .upsert({ owner_id: ctx.userId, policy_key: key, policy_value: value as never });
}
```

**Issue:**
- No schema for valid policy keys
- No validation of policy values (e.g., is "default_payment_terms" a number or object?)
- Different parts of code assume different shapes:
  ```typescript
  // In duely-tools.server.ts
  const v = data?.policy_value as { value?: string } | string | undefined;
  if (typeof v === "string") return v;
  if (v?.value) return v.value;  // Assumes shape: { value: string }
  ```

**Impact:** Silent failures if policy shape changes; no IDE autocomplete for policy keys.

**Recommendation:** Create a type-safe policy schema:
```typescript
type CompanyPolicy = {
  default_currency: string;
  default_payment_terms: number;
  default_payment_terms_unit: "days" | "months";
  // ...
}
```

### C.7 Error Handling Inconsistent
**Finding:** Mix of error patterns:

```typescript
// Pattern 1: DuelyFailure
return fail("not_found", "Invoice not found.", { invoice_id });

// Pattern 2: Object with error field
return { error: "client_not_found", hint: "..." };

// Pattern 3: Object with status field
return { status: "awaiting_approval", note: "..." };
```

**Issue:**
- Callers must handle 3 different error shapes
- No consistent error contract
- Makes client-side error handling fragile

**Recommendation:** Standardize on `DuelyFailure`:
```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: DuelyFailure };
```

### C.8 Payment Method and Payment Reference Not Validated
**Finding:**
```typescript
export type RecordPaymentInput = {
  ...
  payment_method?: string | null;
  reference?: string | null;
  ...
}
```

**Issue:**
- No enum for valid payment methods (bank transfer, card, cash, check, etc.)
- `reference` field unlimited length, no format validation
- No linkage to external payment systems (no Stripe/Gateways integration planned?)

**Impact:** Free-text fields allow user error; no referential integrity to payment processors.

**Recommendation:** Add payment method enum; consider future integration points.

---

## D. P2 FUTURE IMPROVEMENTS

### D.1 Add Multi-User Collaboration with RBAC
**Current:** Single owner-per-tenant model.

**Future:** Support multiple users (accountant, staff) with roles:
- Owner (full access)
- Accountant (can view all, can only record payments)
- Staff (view-only on assigned clients)

**Implementation:** Add `user_roles` table, row-level access via RLS policy:
```sql
CREATE POLICY "role_based_access" ON invoices
  USING (owner_id = auth.uid() OR 
         (SELECT role FROM user_roles WHERE user_id = auth.uid() AND org_id = (SELECT org_id FROM invoices)))
```

### D.2 Real-Time Sync (WebSocket) for Multi-User Workflows
**Current:** Polling via React Query.

**Future:** WebSocket subscriptions for live invoice updates, payment notifications.

**Benefit:** Immediate notification of payment received; no race conditions in approval workflows.

### D.3 API Keys for Third-Party Integrations
**Current:** No external integrations.

**Future:** Stripe webhooks, Zapier/IFTTT triggers, custom integrations.

**Implementation:**
- Add `api_keys` table with scoped permissions
- Allow read-only access to invoices/payments via API
- Webhook signing with HMAC-SHA256

### D.4 Installment Payment Due Reminders (SMS/Email/Push)
**Current:** Notifications generated but not sent (simulated).

**Future:**
- Integration with Twilio (SMS), Mailgun (Email), Firebase (Push)
- Scheduled sending 3 days before due, 1 day late, weekly escalation
- Rate limiting to prevent spam

### D.5 AI Fine-Tuning with User Corrections
**Current:** Gemini model used as-is.

**Future:** 
- Collect user corrections (approved vs. rejected tool calls)
- Fine-tune smaller model on corrections
- Trade-off cost vs. accuracy

### D.6 Bulk Invoice Import
**Current:** AI-driven creation or manual one-by-one.

**Future:**
- CSV/Excel import
- OCR for scanned invoices
- Batch creation with validation preview

### D.7 Batch Payment Recording
**Current:** Single payment per action.

**Future:**
- Bank statement import (CSV)
- Reconciliation with uploaded statements
- Automatic matching of payments to invoices

### D.8 Discount/Overdue Fee Automation
**Current:** Manual; AI can suggest.

**Future:**
- Auto-apply 2% early-pay discount if paid before day 10
- Auto-add late fee (0.5% per week) after 30 days
- Configurable per client

### D.9 Financial Reporting & Analytics
**Current:** Dashboard shows basic metrics.

**Future:**
- Monthly cash flow forecast
- Aging analysis (30/60/90 days overdue)
- Client profitability
- PDF report generation

### D.10 Audit Log Retention & Compliance
**Current:** Audit logs stored indefinitely; no retention policy.

**Future:**
- 7-year retention (typical tax audit)
- Immutable archive after retention period
- Compliance export for SOX/GDPR
- Audit log signing for tamper evidence

---

## E. RECOMMENDED ARCHITECTURE

### E.1 Short-Term (Next Sprint - 2-4 weeks)
1. **Add Test Suite** (P0)
   - Unit tests for finance-core
   - Integration tests for payment recording
   - State machine transition tests
   - ~200 test cases covering happy path + edge cases

2. **Stabilize AI Approval Workflow** (P0)
   - Add `expires_at` (15 min default) to ai_actions
   - Re-fetch entity before execution; validate state hasn't changed
   - Add state_hash comparison
   - Reject approval if entity deleted or status changed

3. **Fix Payment Reversal Audit** (P0)
   - Log reversal with full context in audit_logs
   - Add check: reversal reason must explain why

4. **Normalize Invoice Line Items** (P1)
   - Deprecate `invoices.items` JSONB
   - Always populate `invoice_items` table
   - Add migration to backfill existing invoices

5. **Input Validation** (P1)
   - Create Zod schemas for all financial inputs
   - Validate discount_value, tax_rate, currency codes
   - Validate payment_method enum

### E.2 Medium-Term (Weeks 4-8)
1. **Real-Time Overdue Detection**
   - Add Supabase Edge Function for daily batch
   - Trigger notification sync at midnight

2. **Test Coverage to 80%+**
   - Integration tests for all finance.server functions
   - AI tool execution tests
   - Error scenario tests

3. **Error Handling Standardization**
   - Consistent DuelyFailure contract
   - Type-safe Result<T> wrapper
   - Client-side error UI

4. **Notification Cleanup**
   - Archive old read notifications after 7 days
   - Implement read/unread toggle in UI
   - Pagination for notification list

5. **Company Policy Schema**
   - Type-safe policy schema
   - Validation on upsert
   - Default policies on profile creation

### E.3 Long-Term (Months 2-3+)
1. **Multi-User Collaboration + RBAC**
2. **Real-Time Sync (WebSocket)**
3. **External Integrations (Stripe, Zapier)**
4. **AI Fine-Tuning Pipeline**
5. **Financial Reporting & Analytics**
6. **Audit Compliance Features**

---

## F. EXACT FILES THAT SHOULD BE CHANGED FIRST

### F.1 P0 - Must Fix Before Production
1. **`src/lib/finance.server.ts`** (reversePayment function)
   - Add full audit context logging
   - Add timestamp validation

2. **`src/lib/duely-orchestrator.server.ts`** (resolveAction equivalent in ai.functions.ts)
   - Add action expiration check
   - Re-fetch entity before execution
   - Add state_hash validation

3. **`src/lib/duely-tools.server.ts`** (executeTool function)
   - Add Zod schemas for all financial inputs
   - Fail fast on missing required fields
   - Validate discount/tax/currency

4. **`supabase/migrations/20260812004941_*.sql`** (latest migration)
   - Add `expires_at` column to ai_actions table
   - Add index on (owner_id, status, created_at DESC) for ai_actions
   - Add TTL policy for notifications (if using Supabase row-level security trigger)

5. **Create `tests/finance-core.spec.ts`**
   - Unit tests for all functions in finance-core.ts
   - Test edge cases: rounding, payment allocation, risk scoring

6. **Create `tests/payment-integration.spec.ts`**
   - Integration tests for recordPayment, reversePayment
   - Idempotency tests
   - State machine transition tests

### F.2 P1 - Improve Architecture (Weeks 2-3)
1. **`src/lib/finance-core.ts`**
   - Stabilize API (no breaking changes before tests added)

2. **`src/lib/finance.server.ts`**
   - Normalize line items (deprecate JSONB path)
   - Add comprehensive error logging

3. **`src/lib/duely-tools.server.ts`**
   - Standardize error contract
   - Add payment_method enum validation
   - Add company policy schema validation

4. **Create `src/lib/policies.ts`**
   - Type-safe company policy schema
   - Default policy factory
   - Validation functions

5. **Create `src/lib/errors.ts`**
   - Unified error handling
   - Result<T> wrapper type
   - Error serialization for API responses

6. **`src/integrations/supabase/auth-middleware.ts`**
   - No changes needed; already solid

---

## G. RECOMMENDED DEVELOPMENT SEQUENCE

### Phase 1: Stabilization (Week 1)
**Goal:** Make system production-safe for financial data.

1. Write finance-core unit tests (1 day)
2. Fix AI approval staleness (1 day)
3. Add payment reversal audit logging (1 day)
4. Add input validation schemas (1 day)
5. Deploy + monitoring (1 day)

**Deliverable:** Minimal test suite (200 tests), no blocking bugs.

### Phase 2: Normalization (Week 2)
**Goal:** Simplify codebase for maintenance.

1. Normalize invoice line items (1 day)
2. Standardize error handling (1 day)
3. Create policies/settings type safety (1 day)
4. Clean up notification old records (1 day)
5. Deploy + documentation (1 day)

**Deliverable:** Simpler codebase, fewer error patterns.

### Phase 3: Automation (Week 3)
**Goal:** Reduce manual toil.

1. Add scheduled overdue detection (1 day)
2. Implement notification cleanup (1 day)
3. Add payment plan risk monitoring (1 day)
4. Deploy + test at scale (1 day)

**Deliverable:** 24/7 financial monitoring, no user action needed.

### Phase 4: Integration (Week 4+)
**Goal:** Enable external systems.

1. Add API key management (2 days)
2. Implement Stripe webhook (2 days)
3. Add CSV import for bulk payments (2 days)
4. Deploy + documentation (1 day)

**Deliverable:** Third-party system integration.

---

## H. PRODUCTION-READY vs. MVP-QUALITY ASSESSMENT

### ✅ PRODUCTION-READY

1. **Financial Core Math**
   - `finance-core.ts` well-designed, pure functions
   - Correct rounding, tax calculation, discount handling
   - State machine enforced

2. **Database RLS**
   - Owner-scoped access enforced at DB level
   - Policies comprehensive and correct
   - Cannot bypass via application

3. **Payment Idempotency**
   - `idempotency_key` uniqueness enforced
   - Deduplication logic solid
   - No duplicate payments possible (if key provided)

4. **Authentication & Authorization**
   - JWT token validation solid
   - Server middleware enforces auth on all endpoints
   - Client-side token storage (localStorage) acceptable for MVP

5. **Error Handling Framework**
   - Server crash handling via error-capture.ts
   - SSR errors wrapped and rendered safely
   - Lovable error reporting configured

6. **Invoice Status State Machine**
   - Transitions well-defined and enforced
   - Draft→Sent→Paid path clear
   - Reversal transitions correctly modeled

### ⚠️ MVP-QUALITY (Needs Work)

1. **Test Coverage**
   - **0% automated tests** - Critical gap
   - All validation human-tested only
   - Risk of regressions in production

2. **AI Action Staleness**
   - No expiration checks on approvals
   - Can execute on stale data
   - Risk of user confusion/unintended actions

3. **Input Validation**
   - Insufficient server-side validation
   - Rely on client-side + finance-core clamping
   - Tax rate, discount %, amounts under-validated

4. **Overdue Detection**
   - Lazy evaluation (on-demand refresh)
   - Not guaranteed to run at midnight
   - Notifications delayed if user doesn't visit

5. **Error Consistency**
   - Three different error shapes in code
   - Client must handle { error }, { status }, and DuelyFailure
   - Fragile error handling

6. **Multi-Currency Support**
   - Supported in schema (currency field on invoices, payments)
   - But NO conversion rates
   - NO mixing currencies in payment plans
   - Mixing USD payment to AED invoice creates invalid state

7. **Email/SMS Sending**
   - All reminders and notifications marked "simulated"
   - No actual outbound integration
   - Users must manually send messages

8. **Audit Logging**
   - `audit_logs` table created but minimal usage
   - Payment recording logs minimal state
   - No cryptographic signing for tamper-evidence

9. **Performance**
   - No query optimization (no indexes on hot paths beyond basics)
   - No caching layer (Redis)
   - Dashboard could N+1 if many clients/invoices

10. **Concurrency**
    - No optimistic locking (version fields)
    - Two users can edit same invoice simultaneously
    - Last write wins (dangerous for financial data)

### Summary Table

| Subsystem | Status | Confidence |
|-----------|--------|------------|
| Finance Core Math | ✅ Production-Ready | 95% |
| Database RLS | ✅ Production-Ready | 95% |
| Payment Recording | ⚠️ MVP (needs tests) | 70% |
| Payment Reversal | ⚠️ MVP (needs audit) | 65% |
| AI Integration | ⚠️ MVP (staleness risk) | 60% |
| Authentication | ✅ Production-Ready | 90% |
| Invoice Status Machine | ✅ Production-Ready | 90% |
| Notifications | ⚠️ MVP (simulated sending) | 50% |
| Error Handling | ⚠️ MVP (inconsistent) | 60% |
| Test Coverage | ❌ Not Ready | 0% |

---

## CONCLUSION

Duely has a **solid financial core** (`finance-core.ts`, `finance.server.ts`) with well-designed payment engine, correct math, and strong RLS-based authorization. The AI orchestration layer is clever and flexible, with good autonomy levels.

However, **critical gaps prevent immediate production use:**

1. **Zero test coverage** - unacceptable for financial software
2. **AI approval staleness** - can execute on stale data
3. **Input validation gaps** - insufficient server-side checks
4. **No email/SMS** - reminders are simulated only
5. **Overdue detection not guaranteed** - relies on user page refresh

**Recommendation:** Complete **Phase 1 (Stabilization)** checklist before production launch. With tests, approval fixes, and input validation added, system would be **production-quality** within 1-2 weeks.

Current status: **MVP v1 - Suitable for internal testing or single-user early access, not recommended for production with multiple concurrent users or large financial volume.**
