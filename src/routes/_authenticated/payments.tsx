import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { usePayments } from "@/lib/queries";
import { formatMoney, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useDuely } from "@/lib/duely-context";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Duely" },
      { name: "description", content: "Every payment received, matched to its invoice and client." },
      { property: "og:title", content: "Payments — Duely" },
      { property: "og:description", content: "Every payment received, matched to its invoice and client." },
    ],
  }),
  component: PaymentsPage,
});

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  method: string | null;
  clients?: { name: string } | null;
  invoices?: { invoice_number: string } | null;
};

function PaymentsPage() {
  const { t, lang } = useI18n();
  const { setPage } = useDuely();
  const payments = usePayments();
  useEffect(() => setPage("payments"), [setPage]);

  const rows = (payments.data ?? []) as unknown as PaymentRow[];
  const total = rows.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return (
    <div className="space-y-5 p-6 lg:p-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("payments")}</h1>
        <div className="text-end">
          <p className="text-xs text-muted-foreground">{t("total_paid")}</p>
          <p className="text-lg font-semibold text-success">{formatMoney(total, "AED", lang)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.clients?.name ?? "—"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.invoices?.invoice_number ?? "—"} · {formatDate(p.payment_date, lang)}
                  {p.method ? ` · ${p.method}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold text-success">{formatMoney(p.amount, p.currency, lang)}</p>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              {lang === "ar" ? "لا توجد مدفوعات بعد." : "No payments recorded yet."}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}