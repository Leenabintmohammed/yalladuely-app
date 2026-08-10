import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/duely/StatusBadge";
import { useAiActions, useInvoices, usePayments, useProfile, summarize, type InvoiceRow } from "@/lib/queries";
import { formatMoney, daysOverdue, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useDuely } from "@/lib/duely-context";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Duely" },
      { name: "description", content: "Cash position, overdue invoices and AI activity at a glance." },
      { property: "og:title", content: "Dashboard — Duely" },
      { property: "og:description", content: "Cash position, overdue invoices and AI activity at a glance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t, lang } = useI18n();
  const { setPage, setPrefill, setAiOpen } = useDuely();
  const invoices = useInvoices();
  const payments = usePayments();
  const actions = useAiActions();
  const profile = useProfile();

  useEffect(() => setPage("dashboard"), [setPage]);

  const rows = (invoices.data ?? []) as unknown as InvoiceRow[];
  const s = summarize(rows, (payments.data ?? []) as { amount: number; payment_date: string }[]);
  const currency = profile.data?.currency ?? "AED";

  const cards = [
    { key: "outstanding" as const, value: s.outstanding, tone: "text-foreground" },
    { key: "overdue" as const, value: s.overdueTotal, tone: "text-destructive" },
    { key: "paid_this_month" as const, value: s.paidThisMonth, tone: "text-success" },
    { key: "expected_this_month" as const, value: s.expectedThisMonth, tone: "text-foreground" },
  ];

  const ask = (q: string) => {
    setPrefill(q);
    setAiOpen(true);
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ar" ? "لوحة التحكم" : `Hello${profile.data?.full_name ? `, ${profile.data.full_name}` : ""}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {lang === "ar" ? "نظرة سريعة على وضعك المالي." : "Here's where your money stands today."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.key} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(c.key)}</p>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${c.tone}`}>
              {formatMoney(c.value, currency, lang)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4 text-primary" />
            {t("intelligence")}
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {s.overdueCount > 0 ? (
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <button className="text-start hover:underline" onClick={() => ask("Chase all overdue invoices")}>
                  {lang === "ar"
                    ? `${s.overdueCount} فاتورة متأخرة بقيمة ${formatMoney(s.overdueTotal, currency, lang)} — اطلب من ديولي المتابعة.`
                    : `${s.overdueCount} overdue invoice(s) worth ${formatMoney(s.overdueTotal, currency, lang)} — ask Duely to chase them.`}
                </button>
              </li>
            ) : (
              <li className="text-muted-foreground">
                {lang === "ar" ? "لا توجد فواتير متأخرة. عمل رائع." : "Nothing overdue. Cash flow looks healthy."}
              </li>
            )}
            <li className="text-muted-foreground">
              {lang === "ar"
                ? `${rows.length} فاتورة إجمالاً في النظام.`
                : `${rows.length} invoice(s) tracked in total.`}
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">{t("recent_ai")}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {(actions.data ?? []).slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-muted-foreground">{a.intent || a.tool_name}</span>
                <StatusBadge status={a.status} />
              </li>
            ))}
            {(actions.data ?? []).length === 0 && (
              <li className="text-muted-foreground">
                {lang === "ar" ? "لا يوجد نشاط بعد." : "No AI activity yet."}
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-4 text-sm font-semibold">{t("overdue_invoices")}</h2>
        <ul className="divide-y divide-border">
          {s.overdue.slice(0, 6).map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{inv.clients?.name ?? inv.invoice_number}</p>
                <p className="text-xs text-muted-foreground">
                  {inv.invoice_number} · {formatDate(inv.due_date, lang)} · {daysOverdue(inv.due_date)}d
                </p>
              </div>
              <span className="font-medium text-destructive">
                {formatMoney(inv.remaining_balance, inv.currency ?? currency, lang)}
              </span>
            </li>
          ))}
          {s.overdue.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground">
              {lang === "ar" ? "لا شيء متأخر." : "Nothing overdue right now."}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}