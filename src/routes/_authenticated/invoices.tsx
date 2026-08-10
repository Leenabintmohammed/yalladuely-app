import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/duely/StatusBadge";
import { useInvoices, isOverdue, type InvoiceRow } from "@/lib/queries";
import { formatMoney, formatDate, daysOverdue } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useDuely } from "@/lib/duely-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Duely" },
      { name: "description", content: "Track every invoice, balance and due date in one place." },
      { property: "og:title", content: "Invoices — Duely" },
      { property: "og:description", content: "Track every invoice, balance and due date in one place." },
    ],
  }),
  component: InvoicesPage,
});

const filters = ["all", "draft", "sent", "overdue", "paid"] as const;

function InvoicesPage() {
  const { t, lang } = useI18n();
  const { setPage, setFocus, focus, setPrefill, setAiOpen } = useDuely();
  const invoices = useInvoices();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  useEffect(() => setPage("invoices"), [setPage]);

  const rows = (invoices.data ?? []) as unknown as InvoiceRow[];
  const list = rows.filter((i) =>
    filter === "all" ? true : filter === "overdue" ? isOverdue(i) : i.status === filter,
  );

  return (
    <div className="space-y-5 p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("invoices")}</h1>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {t(f)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="font-medium">{t("no_invoices_title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("no_invoices_body")}</p>
          <Button
            className="mt-4"
            onClick={() => {
              setPrefill(
                lang === "ar" ? "أنشئ فاتورة لـ " : "Create an invoice for ",
              );
              setAiOpen(true);
            }}
          >
            {lang === "ar" ? "اسأل ديولي" : "Ask Duely"}
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {list.map((inv) => {
              const active = focus?.type === "invoice" && focus.id === inv.id;
              return (
                <li key={inv.id}>
                  <button
                    onClick={() =>
                      setFocus(
                        active
                          ? null
                          : {
                              type: "invoice",
                              id: inv.id,
                              summary: `${inv.invoice_number} · ${inv.clients?.name ?? ""}`,
                            },
                      )
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition-colors hover:bg-secondary/60",
                      active && "bg-primary-soft/60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{inv.clients?.name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {inv.invoice_number} · {t("overdue") && formatDate(inv.due_date, lang)}
                        {isOverdue(inv) ? ` · ${daysOverdue(inv.due_date)}d` : ""}
                      </p>
                    </div>
                    <StatusBadge status={isOverdue(inv) ? "overdue" : inv.status} />
                    <div className="w-32 text-end">
                      <p className="text-sm font-semibold">{formatMoney(inv.amount, inv.currency, lang)}</p>
                      {Number(inv.remaining_balance) !== Number(inv.amount) && (
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(inv.remaining_balance, inv.currency, lang)} left
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}