import type { SupabaseClient } from "@supabase/supabase-js";
import {
  audit,
  clientRisk,
  createPaymentPlan,
  recalcInvoice,
  recalcInvoiceTotals,
  recalcPlan,
  recordPayment,
  refreshOverdueInvoices,
  replaceInvoiceItems,
  reversePayment,
  setInvoiceStatus,
  setPlanStatus,
  syncNotifications,
} from "./finance.server";
import {
  computeInvoiceTotals,
  deriveInvoiceStatus,
  isEditableInvoice,
  round2,
} from "./finance-core";
import { fail, isFailure } from "./finance-errors";

export type Autonomy = "auto" | "approval_required" | "human_only";

export type ToolCtx = { supabase: SupabaseClient; userId: string; actor?: "ai" | "human" | "system" };

export const TOOL_AUTONOMY: Record<string, Autonomy> = {
  create_client: "auto",
  update_client: "auto",
  get_client: "auto",
  list_clients: "auto",
  create_invoice: "auto",
  update_invoice: "auto",
  get_invoice: "auto",
  list_invoices: "auto",
  record_payment: "auto",
  get_outstanding_balance: "auto",
  list_overdue_invoices: "auto",
  generate_reminder: "auto",
  get_dashboard_summary: "auto",
  get_client_financial_summary: "auto",
  get_company_policies: "auto",
  save_memory: "auto",
  send_invoice: "approval_required",
  send_reminder: "approval_required",
  update_company_policy: "approval_required",
  create_payment_plan: "approval_required",
  cancel_payment_plan: "approval_required",
  pause_payment_plan: "approval_required",
  resume_payment_plan: "approval_required",
  cancel_invoice: "approval_required",
  update_invoice_items: "auto",
  reverse_payment: "approval_required",
  record_installment_payment: "auto",
  list_payment_plans: "auto",
  get_payment_plan: "auto",
  get_client_risk: "auto",
  list_at_risk_clients: "auto",
  list_notifications: "auto",
  list_audit_log: "auto",
  write_off_invoice: "human_only",
  delete_client: "human_only",
  delete_invoice: "human_only",
};

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function deriveStatus(inv: {
  status: string;
  amount: number;
  paid_amount: number;
  due_date: string;
}): string {
  return deriveInvoiceStatus(inv);
}

async function resolveClient(ctx: ToolCtx, p: { client_id?: string; client_name?: string }) {
  if (p.client_id) {
    const { data } = await ctx.supabase.from("clients").select("*").eq("id", p.client_id).maybeSingle();
    return data;
  }
  if (!p.client_name) return null;
  const { data } = await ctx.supabase
    .from("clients")
    .select("*")
    .or(`name.ilike.%${p.client_name}%,company_name.ilike.%${p.client_name}%`)
    .limit(2);
  if (!data || data.length !== 1) return data && data.length > 1 ? { __ambiguous: data } : null;
  return data[0];
}

async function nextInvoiceNumber(ctx: ToolCtx) {
  const { data } = await ctx.supabase
    .from("invoices")
    .select("invoice_number")
    .eq("owner_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(50);
  let max = 0;
  for (const row of data ?? []) {
    const m = /(\d+)$/.exec(row.invoice_number ?? "");
    if (m) max = Math.max(max, parseInt(m[1]!, 10));
  }
  return `INV-${String(max + 1).padStart(3, "0")}`;
}

async function defaultCurrency(ctx: ToolCtx) {
  const { data } = await ctx.supabase
    .from("company_policies")
    .select("policy_value")
    .eq("policy_key", "default_currency")
    .maybeSingle();
  const v = data?.policy_value as { value?: string } | string | undefined;
  if (typeof v === "string") return v;
  if (v?.value) return v.value;
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("currency")
    .eq("id", ctx.userId)
    .maybeSingle();
  return profile?.currency ?? "AED";
}

async function defaultTerms(ctx: ToolCtx) {
  const { data } = await ctx.supabase
    .from("company_policies")
    .select("policy_value")
    .eq("policy_key", "default_payment_terms")
    .maybeSingle();
  const v = data?.policy_value as { days?: number; value?: number } | number | undefined;
  if (typeof v === "number") return v;
  return v?.days ?? v?.value ?? 30;
}

async function syncInvoice(ctx: ToolCtx, invoiceId: string) {
  return recalcInvoice(ctx, invoiceId);
}

export async function refreshOverdue(ctx: ToolCtx) {
  await refreshOverdueInvoices(ctx);
}

export async function executeTool(name: string, params: Record<string, unknown>, ctx: ToolCtx): Promise<unknown> {
  const p = params ?? {};
  if (TOOL_AUTONOMY[name] === "human_only")
    return fail(
      "forbidden",
      "This action can only be performed manually by the business owner and is not available to the assistant.",
      { tool: name },
    );
  switch (name) {
    case "create_client": {
      const { data, error } = await ctx.supabase
        .from("clients")
        .insert({
          owner_id: ctx.userId,
          name: String(p['name'] ?? "").trim(),
          company_name: (p['company_name'] as string) ?? null,
          email: (p['email'] as string) ?? null,
          phone: (p['phone'] as string) ?? null,
          billing_address: (p['billing_address'] as string) ?? null,
          preferred_language: (p['preferred_language'] as string) ?? "en",
          notes: (p['notes'] as string) ?? null,
        })
        .select("*")
        .single();
      if (error) return { error: error.message };
      return { created: true, client: data };
    }
    case "update_client": {
      const client = await resolveClient(ctx, p as never);
      if (!client || "__ambiguous" in client) return { error: "client_not_resolved", candidates: client };
      const patch: Record<string, unknown> = {};
      for (const k of ["name", "company_name", "email", "phone", "billing_address", "status", "notes", "preferred_language"])
        if (p[k] !== undefined) patch[k] = p[k];
      const { data, error } = await ctx.supabase
        .from("clients")
        .update(patch)
        .eq("id", client['id'])
        .select("*")
        .single();
      if (error) return { error: error.message };
      return { updated: true, client: data };
    }
    case "get_client": {
      const client = await resolveClient(ctx, p as never);
      if (!client) return { error: "not_found" };
      return { client };
    }
    case "list_clients": {
      const { data } = await ctx.supabase
        .from("clients")
        .select("id,name,company_name,email,status")
        .order("created_at", { ascending: false })
        .limit(50);
      return { clients: data ?? [] };
    }
    case "create_invoice": {
      const client = await resolveClient(ctx, p as never);
      if (!client) return { error: "client_not_found", hint: "Ask the user to confirm the client, or create it first." };
      if ("__ambiguous" in client) return { error: "multiple_clients_match", candidates: client['__ambiguous'] };
      const rawItems = (p['items'] as { description?: string; amount?: number; quantity?: number; unit_price?: number }[] | undefined) ?? null;
      const totals = computeInvoiceTotals({
        items: rawItems?.length
          ? rawItems
          : [{ description: (p['description'] as string) ?? "Services", amount: num(p['amount']) }],
        discount_type: (p['discount_type'] as string) ?? "none",
        discount_value: num(p['discount_value']),
        tax_rate: num(p['tax_rate']),
      });
      if (!(totals.total > 0)) return fail("validation_failed", "Invoice total must be greater than zero.");
      const currency = (p['currency'] as string) ?? (await defaultCurrency(ctx));
      const terms = p['due_in_days'] !== undefined ? num(p['due_in_days'], 30) : await defaultTerms(ctx);
      const due = (p['due_date'] as string) ?? addDays(terms);
      const issue = (p['issue_date'] as string) ?? today();
      if (due < issue) return fail("validation_failed", "Due date cannot be before the issue date.");
      const { data, error } = await ctx.supabase
        .from("invoices")
        .insert({
          owner_id: ctx.userId,
          client_id: client['id'],
          invoice_number: (p['invoice_number'] as string) ?? (await nextInvoiceNumber(ctx)),
          amount: totals.total,
          subtotal: totals.subtotal,
          discount_type: totals.discount_type,
          discount_value: totals.discount_value,
          discount_amount: totals.discount_amount,
          tax_rate: totals.tax_rate,
          tax_amount: totals.tax_amount,
          currency,
          status: "draft",
          issue_date: issue,
          due_date: due,
          remaining_balance: totals.total,
          items: totals.items as never,
          notes: (p['notes'] as string) ?? null,
        })
        .select("*")
        .single();
      if (error) return fail("internal_error", error.message);
      if (totals.items.length)
        await ctx.supabase.from("invoice_items").insert(
          totals.items.map((it, i) => ({
            owner_id: ctx.userId,
            invoice_id: data.id,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            line_total: it.line_total,
            sort_order: i,
          })),
        );
      await audit(ctx, {
        entity_type: "invoice",
        entity_id: data.id,
        action: "invoice.created",
        after_state: { amount: totals.total, currency, due_date: due },
      });
      return { created: true, invoice: data, client_name: client['name'] };
    }
    case "update_invoice": {
      const id = p['invoice_id'] as string;
      if (!id) return fail("validation_failed", "invoice_id is required.");
      const { data: current } = await ctx.supabase.from("invoices").select("*").eq("id", id).maybeSingle();
      if (!current) return fail("not_found", "Invoice not found.", { invoice_id: id });
      const financialKeys = ["amount", "items", "currency", "discount_type", "discount_value", "tax_rate"];
      const touchesMoney = financialKeys.some((k) => p[k] !== undefined);
      if (touchesMoney && !isEditableInvoice(current.status))
        return fail("invoice_locked", `Invoice ${current.invoice_number} is ${current.status}; its amounts are locked.`);
      if (p['status'] !== undefined) {
        const moved = await setInvoiceStatus(ctx, id, String(p['status']));
        if (isFailure(moved)) return moved;
      }
      const patch: Record<string, unknown> = {};
      for (const k of ["currency", "due_date", "issue_date", "notes"])
        if (p[k] !== undefined) patch[k] = p[k];
      if (Object.keys(patch).length) {
        const { error } = await ctx.supabase.from("invoices").update(patch).eq("id", id).select("*").single();
        if (error) return fail("internal_error", error.message);
      }
      if (p['amount'] !== undefined || p['discount_type'] !== undefined || p['discount_value'] !== undefined || p['tax_rate'] !== undefined || p['items'] !== undefined) {
        const recalculated = await recalcInvoiceTotals(ctx, id, {
          ...(p['items'] !== undefined ? { items: p['items'] as never } : {}),
          ...(p['items'] === undefined && p['amount'] !== undefined ? { items: null, subtotal: num(p['amount']) } : {}),
          ...(p['discount_type'] !== undefined ? { discount_type: String(p['discount_type']) } : {}),
          ...(p['discount_value'] !== undefined ? { discount_value: num(p['discount_value']) } : {}),
          ...(p['tax_rate'] !== undefined ? { tax_rate: num(p['tax_rate']) } : {}),
        });
        if (isFailure(recalculated)) return recalculated;
      }
      await syncInvoice(ctx, id);
      const { data } = await ctx.supabase.from("invoices").select("*").eq("id", id).maybeSingle();
      await audit(ctx, {
        entity_type: "invoice",
        entity_id: id,
        action: "invoice.updated",
        before_state: { amount: current.amount, status: current.status, due_date: current.due_date },
        after_state: { amount: data?.amount, status: data?.status, due_date: data?.due_date },
      });
      return { updated: true, invoice: data };
    }
    case "update_invoice_items": {
      const id = p['invoice_id'] as string;
      if (!id) return fail("validation_failed", "invoice_id is required.");
      const items = p['items'] as { description?: string; quantity?: number; unit_price?: number }[] | undefined;
      if (!Array.isArray(items) || !items.length) return fail("validation_failed", "At least one line item is required.");
      return await replaceInvoiceItems(ctx, id, items);
    }
    case "cancel_invoice": {
      const id = p['invoice_id'] as string;
      if (!id) return fail("validation_failed", "invoice_id is required.");
      return await setInvoiceStatus(ctx, id, "cancelled");
    }
    case "get_invoice": {
      let q = ctx.supabase.from("invoices").select("*, clients(name,company_name,email)");
      q = p['invoice_id']
        ? q.eq("id", p['invoice_id'] as string)
        : q.ilike("invoice_number", `%${String(p['invoice_number'] ?? "")}%`);
      const { data } = await q.limit(1).maybeSingle();
      return data ? { invoice: data } : { error: "not_found" };
    }
    case "list_invoices": {
      await refreshOverdue(ctx);
      let q = ctx.supabase
        .from("invoices")
        .select("id,invoice_number,amount,currency,status,due_date,remaining_balance,client_id, clients(name)")
        .order("due_date", { ascending: true })
        .limit(50);
      if (p['status']) q = q.eq("status", p['status'] as string);
      if (p['client_id']) q = q.eq("client_id", p['client_id'] as string);
      const { data } = await q;
      return { invoices: data ?? [] };
    }
    case "record_payment": {
      const amount = num(p['amount']);
      if (!amount) return { error: "missing_amount" };
      let invoiceId = p['invoice_id'] as string | undefined;
      let client = null as Record<string, unknown> | null;
      if (!invoiceId) {
        client = (await resolveClient(ctx, p as never)) as Record<string, unknown> | null;
        if (!client) return { error: "client_not_found" };
        if ("__ambiguous" in client) return { error: "multiple_clients_match", candidates: client['__ambiguous'] };
        const { data: open } = await ctx.supabase
          .from("invoices")
          .select("id,invoice_number,amount,remaining_balance,due_date,status")
          .eq("client_id", client['id'] as string)
          .not("status", "in", "(paid,cancelled,draft)")
          .order("due_date", { ascending: true });
        if (!open || open.length === 0) return { error: "no_open_invoices", client: client['name'] };
        if (open.length > 1) return { error: "multiple_open_invoices", options: open };
        invoiceId = open[0]!.id;
      }
      const { data: inv } = await ctx.supabase.from("invoices").select("*").eq("id", invoiceId!).maybeSingle();
      if (!inv) return { error: "invoice_not_found" };
      const { data: payment, error } = await ctx.supabase
        .from("payments")
        .insert({
        owner_id: ctx.userId,
        invoice_id: invoiceId!,
        client_id: inv.client_id,
        amount,
        currency: inv.currency,
        payment_date: (p['payment_date'] as string) ?? today(),
        payment_method: (p['payment_method'] as string) ?? null,
        reference: (p['reference'] as string) ?? null,
        notes: (p['notes'] as string) ?? null,
          plan_id: (p['plan_id'] as string) ?? null,
          installment_id: (p['installment_id'] as string) ?? null,
        })
        .select("*")
        .single();
      if (error) return { error: error.message };
      const updated = await syncInvoice(ctx, invoiceId!);
      if (payment?.plan_id) await recalcPlan(ctx, payment.plan_id);
      if (payment)
        await notifyPaymentReceived(ctx, {
          payment_id: payment.id,
          invoice_id: payment.invoice_id,
          client_id: payment.client_id,
          amount,
          currency: payment.currency,
        });
      const late = updated ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000) : 0;
      await ctx.supabase.from("client_memory").upsert(
        {
          owner_id: ctx.userId,
          client_id: inv.client_id,
          memory_type: "payment_behavior",
          memory_key: "last_payment_delay_days",
          memory_value: { days: late, invoice: inv.invoice_number, amount },
          confidence: 1,
          source: "system",
        },
        { onConflict: "owner_id,client_id,memory_key" },
      );
      return { recorded: true, invoice: updated };
    }
    case "get_outstanding_balance": {
      await refreshOverdue(ctx);
      let q = ctx.supabase
        .from("invoices")
        .select("remaining_balance,currency,status,due_date,invoice_number, clients(name)")
        .not("status", "in", "(paid,cancelled,draft)");
      if (p['client_id']) q = q.eq("client_id", p['client_id'] as string);
      const { data } = await q;
      const total = (data ?? []).reduce((s, i) => s + num(i.remaining_balance), 0);
      return { total_outstanding: total, invoices: data ?? [] };
    }
    case "list_overdue_invoices": {
      await refreshOverdue(ctx);
      const { data } = await ctx.supabase
        .from("invoices")
        .select("id,invoice_number,amount,remaining_balance,currency,due_date, clients(name,company_name)")
        .eq("status", "overdue")
        .order("due_date", { ascending: true });
      return {
        overdue: (data ?? []).map((i) => ({
          ...i,
          days_overdue: Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000),
        })),
      };
    }
    case "generate_reminder": {
      const invoiceId = p['invoice_id'] as string;
      if (!invoiceId) return { error: "missing_invoice_id" };
      const { data: inv } = await ctx.supabase
        .from("invoices")
        .select("*, clients(name,company_name,email)")
        .eq("id", invoiceId)
        .maybeSingle();
      if (!inv) return { error: "invoice_not_found" };
      const tone = (p['tone'] as string) ?? "friendly";
      const message = (p['message'] as string) ?? "";
      const { data, error } = await ctx.supabase
        .from("reminders")
        .insert({
          owner_id: ctx.userId,
          invoice_id: invoiceId,
          client_id: inv.client_id,
          channel: (p['channel'] as string) ?? "email",
          reminder_type: tone,
          message,
          status: "draft",
        })
        .select("*")
        .single();
      if (error) return { error: error.message };
      return { reminder: data, invoice_number: inv.invoice_number, client: inv.clients };
    }
    case "send_invoice": {
      const id = p['invoice_id'] as string;
      const { data, error } = await ctx.supabase
        .from("invoices")
        .update({ status: "sent" })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return { error: error.message };
      return { sent: true, simulated: true, invoice: data };
    }
    case "send_reminder": {
      const id = p['reminder_id'] as string;
      const { data, error } = await ctx.supabase
        .from("reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return { error: error.message };
      return { sent: true, simulated: true, reminder: data };
    }
    case "update_company_policy": {
      const key = String(p['policy_key'] ?? "");
      if (!key) return { error: "missing_policy_key" };
      const value = p['policy_value'] ?? null;
      const { data, error } = await ctx.supabase
        .from("company_policies")
        .upsert(
          { owner_id: ctx.userId, policy_key: key, policy_value: value as never },
          { onConflict: "owner_id,policy_key" },
        )
        .select("*")
        .single();
      if (error) return { error: error.message };
      return { saved: true, policy: data };
    }
    case "get_company_policies": {
      const { data } = await ctx.supabase.from("company_policies").select("policy_key,policy_value");
      return { policies: data ?? [] };
    }
    case "save_memory": {
      const client = p['client_id'] || p['client_name'] ? await resolveClient(ctx, p as never) : null;
      const { data, error } = await ctx.supabase
        .from("client_memory")
        .upsert(
          {
            owner_id: ctx.userId,
            client_id: client && !("__ambiguous" in client) ? (client['id'] as string) : null,
            memory_type: String(p['memory_type'] ?? "important_preference"),
            memory_key: String(p['memory_key'] ?? "note"),
            memory_value: (p['memory_value'] ?? true) as never,
            confidence: num(p['confidence'], 1),
            source: "user",
          },
          { onConflict: "owner_id,client_id,memory_key" },
        )
        .select("*")
        .single();
      if (error) return { error: error.message };
      return { saved: true, memory: data };
    }
    case "get_dashboard_summary":
      return await dashboardSummary(ctx);
    case "get_client_financial_summary": {
      const client = await resolveClient(ctx, p as never);
      if (!client || "__ambiguous" in client) return { error: "client_not_resolved" };
      return await clientFinancials(ctx, client['id'] as string);
    }
    case "create_payment_plan": {
      const client = await resolveClient(ctx, p as never);
      if (!client) return { error: "client_not_found" };
      if ("__ambiguous" in client) return { error: "multiple_clients_match", candidates: client['__ambiguous'] };
      let invoiceId = (p['invoice_id'] as string) ?? null;
      let total = num(p['total_amount']);
      let currency = (p['currency'] as string) ?? null;
      if (invoiceId) {
        const { data: inv } = await ctx.supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
        if (!inv) return { error: "invoice_not_found" };
        if (!total) total = num(inv.remaining_balance) || num(inv.amount);
        currency = currency ?? inv.currency;
      }
      if (!total) return { error: "missing_total_amount" };
      return await createPaymentPlan(ctx, {
        client_id: client['id'] as string,
        invoice_id: invoiceId,
        total_amount: total,
        currency: currency ?? (await defaultCurrency(ctx)),
        installment_count: num(p['installment_count'], 3),
        frequency: (p['frequency'] as string) ?? "monthly",
        start_date: (p['start_date'] as string) ?? undefined,
        notes: (p['notes'] as string) ?? null,
      });
    }
    case "list_payment_plans": {
      let q = ctx.supabase
        .from("payment_plans")
        .select("*, clients(name,company_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (p['client_id']) q = q.eq("client_id", p['client_id'] as string);
      if (p['status']) q = q.eq("status", p['status'] as string);
      const { data } = await q;
      return { payment_plans: data ?? [] };
    }
    case "get_payment_plan": {
      const id = p['plan_id'] as string;
      if (!id) return { error: "missing_plan_id" };
      return await recalcPlan(ctx, id);
    }
    case "cancel_payment_plan": {
      const id = p['plan_id'] as string;
      if (!id) return { error: "missing_plan_id" };
      const { data, error } = await ctx.supabase
        .from("payment_plans")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return { error: error.message };
      return { cancelled: true, plan: data };
    }
    case "record_installment_payment": {
      const installmentId = p['installment_id'] as string;
      if (!installmentId) return { error: "missing_installment_id" };
      const { data: inst } = await ctx.supabase
        .from("payment_plan_installments")
        .select("*, payment_plans(id,client_id,invoice_id,currency)")
        .eq("id", installmentId)
        .maybeSingle();
      if (!inst) return { error: "installment_not_found" };
      const plan = inst.payment_plans as {
        id: string;
        client_id: string;
        invoice_id: string | null;
        currency: string;
      } | null;
      const amount = num(p['amount']) || Math.max(0, num(inst.amount) - num(inst.paid_amount));
      if (!amount) return { error: "missing_amount" };
      const { data: payment, error } = await ctx.supabase
        .from("payments")
        .insert({
          owner_id: ctx.userId,
          invoice_id: plan?.invoice_id ?? null,
          client_id: plan?.client_id ?? null,
          plan_id: plan?.id ?? inst.plan_id,
          installment_id: installmentId,
          amount,
          currency: plan?.currency ?? (await defaultCurrency(ctx)),
          payment_date: (p['payment_date'] as string) ?? today(),
          payment_method: (p['payment_method'] as string) ?? null,
          reference: (p['reference'] as string) ?? null,
        })
        .select("*")
        .single();
      if (error) return { error: error.message };
      const state = await recalcPlan(ctx, inst.plan_id);
      await notifyPaymentReceived(ctx, {
        payment_id: payment.id,
        invoice_id: payment.invoice_id,
        client_id: payment.client_id,
        amount,
        currency: payment.currency,
      });
      return { recorded: true, ...state };
    }
    case "reverse_payment": {
      const id = p['payment_id'] as string;
      if (!id) return { error: "missing_payment_id" };
      const { data: pay, error } = await ctx.supabase
        .from("payments")
        .update({ reversed_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return { error: error.message };
      if (pay.invoice_id) await syncInvoice(ctx, pay.invoice_id);
      if (pay.plan_id) await recalcPlan(ctx, pay.plan_id);
      return { reversed: true, payment: pay };
    }
    case "get_client_risk": {
      const client = await resolveClient(ctx, p as never);
      if (!client || "__ambiguous" in client) return { error: "client_not_resolved" };
      const risk = await clientRisk(ctx, client['id'] as string);
      return { client: { id: client['id'], name: client['name'] }, risk };
    }
    case "list_at_risk_clients": {
      return await atRiskClients(ctx);
    }
    case "list_notifications": {
      return await syncNotifications(ctx);
    }
    default:
      return { error: `unknown_tool:${name}` };
  }
}

export async function atRiskClients(ctx: ToolCtx) {
  const { data: clients } = await ctx.supabase.from("clients").select("id,name,company_name").limit(50);
  const scored = await Promise.all(
    (clients ?? []).map(async (c) => ({ ...c, risk: await clientRisk(ctx, c.id) })),
  );
  return {
    clients: scored
      .filter((c) => c.risk.level !== "low")
      .sort((a, b) => b.risk.score - a.risk.score)
      .slice(0, 10),
  };
}

export async function dashboardSummary(ctx: ToolCtx) {
  await refreshOverdue(ctx);
  const { data: invoices } = await ctx.supabase
    .from("invoices")
    .select("id,invoice_number,amount,paid_amount,remaining_balance,currency,status,due_date, clients(name,company_name)");
  const list = invoices ?? [];
  const open = list.filter((i) => !["paid", "cancelled", "draft"].includes(i.status));
  const overdue = list.filter((i) => i.status === "overdue");
  const monthStart = new Date();
  monthStart.setDate(1);
  const { data: payments } = await ctx.supabase
    .from("payments")
    .select("amount,payment_date")
    .gte("payment_date", monthStart.toISOString().slice(0, 10));
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  const { data: plans } = await ctx.supabase
    .from("payment_plans")
    .select("id,status,total_amount,paid_amount,remaining_amount,currency,client_id, clients(name)")
    .in("status", ["active", "at_risk"]);
  const { data: upcoming } = await ctx.supabase
    .from("payment_plan_installments")
    .select("id,seq,due_date,amount,paid_amount,status,plan_id")
    .in("status", ["pending", "partial", "overdue"])
    .order("due_date", { ascending: true })
    .limit(10);
  return {
    outstanding: open.reduce((s, i) => s + num(i.remaining_balance), 0),
    overdue_total: overdue.reduce((s, i) => s + num(i.remaining_balance), 0),
    overdue_count: overdue.length,
    paid_this_month: (payments ?? []).reduce((s, p) => s + num(p.amount), 0),
    expected_this_month: open
      .filter((i) => new Date(i.due_date) < monthEnd)
      .reduce((s, i) => s + num(i.remaining_balance), 0),
    overdue_invoices: overdue.map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      client: (i.clients as { name?: string } | null)?.name,
      remaining_balance: num(i.remaining_balance),
      currency: i.currency,
      days_overdue: Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000),
    })),
    invoice_count: list.length,
    payment_plans: {
      active_count: (plans ?? []).length,
      remaining_total: (plans ?? []).reduce((s, p) => s + num(p.remaining_amount), 0),
      at_risk_count: (plans ?? []).filter((p) => p.status === "at_risk").length,
      plans: plans ?? [],
    },
    upcoming_installments: upcoming ?? [],
  };
}

export async function clientFinancials(ctx: ToolCtx, clientId: string) {
  const { data: client } = await ctx.supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  const { data: invoices } = await ctx.supabase.from("invoices").select("*").eq("client_id", clientId);
  const { data: payments } = await ctx.supabase
    .from("payments")
    .select("amount,payment_date,invoice_id")
    .eq("client_id", clientId);
  const list = invoices ?? [];
  const totalBilled = list.filter((i) => i.status !== "draft").reduce((s, i) => s + num(i.amount), 0);
  const totalPaid = (payments ?? []).reduce((s, p) => s + num(p.amount), 0);
  const outstanding = list
    .filter((i) => !["paid", "cancelled", "draft"].includes(i.status))
    .reduce((s, i) => s + num(i.remaining_balance), 0);
  const delays: number[] = [];
  for (const pay of payments ?? []) {
    const inv = list.find((i) => i.id === pay.invoice_id);
    if (inv) delays.push(Math.floor((new Date(pay.payment_date).getTime() - new Date(inv.due_date).getTime()) / 86400000));
  }
  const avgDelay = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : null;
  const onTime = delays.length ? Math.round((delays.filter((d) => d <= 0).length / delays.length) * 100) : null;
  const overdueInvoices = list.filter((i) => i.status === "overdue");
  const { data: memory } = await ctx.supabase.from("client_memory").select("*").eq("client_id", clientId);
  return {
    client,
    total_billed: totalBilled,
    total_paid: totalPaid,
    outstanding,
    invoice_count: list.length,
    overdue_count: overdueInvoices.length,
    overdue_amount: overdueInvoices.reduce((s, i) => s + num(i.remaining_balance), 0),
    average_payment_delay_days: avgDelay,
    on_time_percentage: onTime,
    payments_recorded: (payments ?? []).length,
    memory: memory ?? [],
  };
}