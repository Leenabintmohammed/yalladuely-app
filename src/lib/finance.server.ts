import type { SupabaseClient } from "@supabase/supabase-js";

export type FinCtx = { supabase: SupabaseClient; userId: string };

export const n = (v: unknown, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};
export const today = () => new Date().toISOString().slice(0, 10);
export const addDaysFrom = (from: string, days: number) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
export const addMonthsFrom = (from: string, months: number) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

/* ---------------- invoice state ---------------- */

export function deriveInvoiceStatus(inv: {
  status: string;
  amount: number;
  paid_amount: number;
  due_date: string;
}): string {
  if (inv.status === "cancelled" || inv.status === "draft") return inv.status;
  if (inv.amount > 0 && inv.paid_amount >= inv.amount) return "paid";
  if (inv.paid_amount > 0) return inv.due_date < today() ? "overdue" : "partially_paid";
  if (inv.due_date < today()) return "overdue";
  return inv.status === "viewed" ? "viewed" : "sent";
}

/** Single source of truth: recompute paid/remaining/status of one invoice from its payments. */
export async function recalcInvoice(ctx: FinCtx, invoiceId: string) {
  const { data: inv } = await ctx.supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!inv) return null;
  const { data: pays } = await ctx.supabase
    .from("payments")
    .select("amount,reversed_at")
    .eq("invoice_id", invoiceId);
  const paid = (pays ?? []).filter((p) => !p.reversed_at).reduce((s, p) => s + n(p.amount), 0);
  const amount = n(inv.amount);
  const status = deriveInvoiceStatus({ status: inv.status, amount, paid_amount: paid, due_date: inv.due_date });
  const { data: updated } = await ctx.supabase
    .from("invoices")
    .update({
      paid_amount: paid,
      remaining_balance: Math.max(0, amount - paid),
      status,
      paid_date: amount > 0 && paid >= amount ? today() : null,
    })
    .eq("id", invoiceId)
    .select("*")
    .single();
  return updated;
}

export async function refreshOverdueInvoices(ctx: FinCtx) {
  await ctx.supabase
    .from("invoices")
    .update({ status: "overdue" })
    .eq("owner_id", ctx.userId)
    .lt("due_date", today())
    .in("status", ["sent", "viewed", "partially_paid"]);
}

/* ---------------- payment plans ---------------- */

function installmentDue(start: string, frequency: string, index: number) {
  if (frequency === "weekly") return addDaysFrom(start, 7 * index);
  if (frequency === "biweekly") return addDaysFrom(start, 14 * index);
  if (frequency === "quarterly") return addMonthsFrom(start, 3 * index);
  return addMonthsFrom(start, index);
}

export async function createPaymentPlan(
  ctx: FinCtx,
  input: {
    client_id: string;
    invoice_id?: string | null;
    total_amount: number;
    currency: string;
    installment_count: number;
    frequency?: string;
    start_date?: string;
    notes?: string | null;
  },
) {
  const count = Math.max(1, Math.round(input.installment_count));
  const total = Math.round(n(input.total_amount) * 100) / 100;
  if (total <= 0) return { error: "invalid_total_amount" };
  const frequency = input.frequency ?? "monthly";
  const start = input.start_date ?? today();

  const { data: plan, error } = await ctx.supabase
    .from("payment_plans")
    .insert({
      owner_id: ctx.userId,
      client_id: input.client_id,
      invoice_id: input.invoice_id ?? null,
      total_amount: total,
      currency: input.currency,
      installment_count: count,
      frequency,
      start_date: start,
      remaining_amount: total,
      status: "active",
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error || !plan) return { error: error?.message ?? "plan_insert_failed" };

  const base = Math.floor((total / count) * 100) / 100;
  const rows = Array.from({ length: count }, (_, i) => ({
    owner_id: ctx.userId,
    plan_id: plan.id,
    seq: i + 1,
    due_date: installmentDue(start, frequency, i),
    amount: i === count - 1 ? Math.round((total - base * (count - 1)) * 100) / 100 : base,
    status: "pending",
  }));
  const { error: iErr } = await ctx.supabase.from("payment_plan_installments").insert(rows);
  if (iErr) return { error: iErr.message };
  return await recalcPlan(ctx, plan.id);
}

/** Recompute installment + plan state from linked payments. */
export async function recalcPlan(ctx: FinCtx, planId: string) {
  const { data: plan } = await ctx.supabase.from("payment_plans").select("*").eq("id", planId).maybeSingle();
  if (!plan) return { error: "plan_not_found" };
  const { data: installments } = await ctx.supabase
    .from("payment_plan_installments")
    .select("*")
    .eq("plan_id", planId)
    .order("seq", { ascending: true });
  const { data: pays } = await ctx.supabase
    .from("payments")
    .select("id,amount,installment_id,reversed_at")
    .eq("plan_id", planId);
  const live = (pays ?? []).filter((p) => !p.reversed_at);

  let unallocated = live.filter((p) => !p.installment_id).reduce((s, p) => s + n(p.amount), 0);
  const updatedInstallments: Record<string, unknown>[] = [];

  for (const inst of installments ?? []) {
    const direct = live.filter((p) => p.installment_id === inst.id).reduce((s, p) => s + n(p.amount), 0);
    let paid = direct;
    const need = Math.max(0, n(inst.amount) - paid);
    if (need > 0 && unallocated > 0) {
      const take = Math.min(need, unallocated);
      paid += take;
      unallocated -= take;
    }
    const status =
      paid >= n(inst.amount) && n(inst.amount) > 0
        ? "paid"
        : paid > 0
          ? inst.due_date < today()
            ? "overdue"
            : "partial"
          : inst.due_date < today()
            ? "overdue"
            : "pending";
    if (paid !== n(inst.paid_amount) || status !== inst.status) {
      await ctx.supabase
        .from("payment_plan_installments")
        .update({ paid_amount: Math.round(paid * 100) / 100, status })
        .eq("id", inst.id);
    }
    updatedInstallments.push({ ...inst, paid_amount: Math.round(paid * 100) / 100, status });
  }

  const paidTotal = live.reduce((s, p) => s + n(p.amount), 0);
  const remaining = Math.max(0, Math.round((n(plan.total_amount) - paidTotal) * 100) / 100);
  const status =
    plan.status === "cancelled"
      ? "cancelled"
      : remaining <= 0
        ? "completed"
        : updatedInstallments.some((i) => i['status'] === "overdue")
          ? "at_risk"
          : "active";
  const { data: saved } = await ctx.supabase
    .from("payment_plans")
    .update({ paid_amount: Math.round(paidTotal * 100) / 100, remaining_amount: remaining, status })
    .eq("id", planId)
    .select("*")
    .single();

  if (plan.invoice_id) await recalcInvoice(ctx, plan.invoice_id);
  return { plan: saved ?? plan, installments: updatedInstallments };
}

/* ---------------- risk intelligence ---------------- */

export type RiskResult = {
  client_id: string;
  score: number;
  level: "low" | "medium" | "high";
  factors: string[];
  average_payment_delay_days: number | null;
  on_time_percentage: number | null;
  overdue_amount: number;
  outstanding: number;
};

export async function clientRisk(ctx: FinCtx, clientId: string): Promise<RiskResult> {
  const { data: invoices } = await ctx.supabase.from("invoices").select("*").eq("client_id", clientId);
  const { data: payments } = await ctx.supabase
    .from("payments")
    .select("amount,payment_date,invoice_id,reversed_at")
    .eq("client_id", clientId);
  const list = invoices ?? [];
  const live = (payments ?? []).filter((p) => !p.reversed_at);

  const delays: number[] = [];
  for (const pay of live) {
    const inv = list.find((i) => i.id === pay.invoice_id);
    if (inv)
      delays.push(Math.floor((new Date(pay.payment_date).getTime() - new Date(inv.due_date).getTime()) / 86400000));
  }
  const avgDelay = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : null;
  const onTime = delays.length ? Math.round((delays.filter((d) => d <= 0).length / delays.length) * 100) : null;
  const open = list.filter((i) => !["paid", "cancelled", "draft"].includes(i.status));
  const outstanding = open.reduce((s, i) => s + n(i.remaining_balance), 0);
  const overdueInv = open.filter((i) => i.due_date < today());
  const overdueAmount = overdueInv.reduce((s, i) => s + n(i.remaining_balance), 0);
  const maxDaysOverdue = overdueInv.reduce(
    (m, i) => Math.max(m, Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000)),
    0,
  );

  let score = 0;
  const factors: string[] = [];
  if (avgDelay !== null && avgDelay > 0) {
    score += Math.min(30, avgDelay * 1.5);
    factors.push(`Pays on average ${avgDelay} days late`);
  }
  if (onTime !== null && onTime < 70) {
    score += (70 - onTime) * 0.3;
    factors.push(`Only ${onTime}% of payments are on time`);
  }
  if (overdueAmount > 0) {
    const ratio = outstanding > 0 ? overdueAmount / outstanding : 1;
    score += ratio * 25;
    factors.push(`${Math.round(ratio * 100)}% of the outstanding balance is overdue`);
  }
  if (maxDaysOverdue > 0) {
    score += Math.min(25, maxDaysOverdue * 0.5);
    factors.push(`Oldest overdue invoice is ${maxDaysOverdue} days past due`);
  }
  if (!delays.length && !overdueAmount) factors.push("No payment history yet — insufficient data");

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: RiskResult["level"] = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  return {
    client_id: clientId,
    score,
    level,
    factors,
    average_payment_delay_days: avgDelay,
    on_time_percentage: onTime,
    overdue_amount: overdueAmount,
    outstanding,
  };
}

/* ---------------- notifications ---------------- */

async function pushNotification(
  ctx: FinCtx,
  row: {
    event_type: string;
    title: string;
    body?: string;
    dedupe_key: string;
    invoice_id?: string | null;
    client_id?: string | null;
    plan_id?: string | null;
    installment_id?: string | null;
  },
) {
  await ctx.supabase
    .from("notifications")
    .upsert({ owner_id: ctx.userId, ...row }, { onConflict: "owner_id,dedupe_key", ignoreDuplicates: true });
}

/** Idempotent notification sweep: due soon, overdue, installment due, plan at risk. */
export async function syncNotifications(ctx: FinCtx) {
  await refreshOverdueInvoices(ctx);
  const soon = addDaysFrom(today(), 3);
  const { data: invoices } = await ctx.supabase
    .from("invoices")
    .select("id,invoice_number,due_date,status,remaining_balance,currency,client_id, clients(name)")
    .eq("owner_id", ctx.userId)
    .not("status", "in", "(paid,cancelled,draft)");

  for (const inv of invoices ?? []) {
    const client = (inv.clients as { name?: string } | null)?.name ?? "client";
    const money = `${inv.currency} ${n(inv.remaining_balance).toLocaleString()}`;
    if (inv.due_date < today()) {
      const days = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
      await pushNotification(ctx, {
        event_type: "invoice_overdue",
        title: `${inv.invoice_number} is overdue`,
        body: `${client} — ${money} overdue by ${days} day(s).`,
        dedupe_key: `invoice_overdue:${inv.id}:${inv.due_date}`,
        invoice_id: inv.id,
        client_id: inv.client_id,
      });
    } else if (inv.due_date <= soon) {
      await pushNotification(ctx, {
        event_type: "invoice_due_soon",
        title: `${inv.invoice_number} is due soon`,
        body: `${client} — ${money} due on ${inv.due_date}.`,
        dedupe_key: `invoice_due_soon:${inv.id}:${inv.due_date}`,
        invoice_id: inv.id,
        client_id: inv.client_id,
      });
    }
  }

  const { data: installments } = await ctx.supabase
    .from("payment_plan_installments")
    .select("id,seq,due_date,amount,paid_amount,status,plan_id, payment_plans(client_id,currency)")
    .eq("owner_id", ctx.userId)
    .in("status", ["pending", "partial", "overdue"])
    .lte("due_date", soon);

  for (const inst of installments ?? []) {
    const plan = inst.payment_plans as { client_id?: string; currency?: string } | null;
    const overdue = inst.due_date < today();
    await pushNotification(ctx, {
      event_type: overdue ? "installment_overdue" : "installment_due_soon",
      title: `Installment ${inst.seq} ${overdue ? "is overdue" : "is due soon"}`,
      body: `${plan?.currency ?? "AED"} ${n(inst.amount) - n(inst.paid_amount)} due on ${inst.due_date}.`,
      dedupe_key: `installment:${overdue ? "overdue" : "soon"}:${inst.id}:${inst.due_date}`,
      plan_id: inst.plan_id,
      installment_id: inst.id,
      client_id: plan?.client_id ?? null,
    });
  }

  const { data: unread } = await ctx.supabase
    .from("notifications")
    .select("*")
    .eq("owner_id", ctx.userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  return { notifications: unread ?? [] };
}

export async function notifyPaymentReceived(
  ctx: FinCtx,
  args: { payment_id: string; invoice_id?: string | null; client_id?: string | null; amount: number; currency: string },
) {
  await pushNotification(ctx, {
    event_type: "payment_received",
    title: "Payment received",
    body: `${args.currency} ${args.amount.toLocaleString()} recorded.`,
    dedupe_key: `payment_received:${args.payment_id}`,
    invoice_id: args.invoice_id ?? null,
    client_id: args.client_id ?? null,
  });
}
