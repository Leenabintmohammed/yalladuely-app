import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/duely/StatusBadge";
import { useClients, useInvoices, type InvoiceRow } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useDuely } from "@/lib/duely-context";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Duely" },
      { name: "description", content: "Every client, what they owe you and how they pay." },
      { property: "og:title", content: "Clients — Duely" },
      { property: "og:description", content: "Every client, what they owe you and how they pay." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { t, lang } = useI18n();
  const { setPage, setFocus, focus, setPrefill, setAiOpen } = useDuely();
  const clients = useClients();
  const invoices = useInvoices();
  const [q, setQ] = useState("");

  useEffect(() => setPage("clients"), [setPage]);

  const rows = (invoices.data ?? []) as unknown as InvoiceRow[];
  const list = (clients.data ?? []).filter((c) =>
    [c.name, c.company_name, c.email].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5 p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("clients")}</h1>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "ar" ? "ابحث…" : "Search clients…"}
            className="w-56 ps-9"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="font-medium">{t("no_clients_title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("no_clients_body")}</p>
          <Button
            className="mt-4"
            onClick={() => {
              setPrefill(lang === "ar" ? "أضف عميل جديد اسمه " : "Add a new client called ");
              setAiOpen(true);
            }}
          >
            {lang === "ar" ? "اسأل ديولي" : "Ask Duely"}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const mine = rows.filter((i) => i.client_id === c.id);
            const outstanding = mine
              .filter((i) => !["paid", "cancelled", "draft"].includes(i.status))
              .reduce((s, i) => s + Number(i.remaining_balance ?? 0), 0);
            const active = focus?.type === "client" && focus.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() =>
                  setFocus(active ? null : { type: "client", id: c.id, summary: c.company_name || c.name })
                }
                className={`rounded-xl border bg-card p-5 text-start transition-colors ${
                  active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.company_name || c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</p>
                  </div>
                  <StatusBadge status={c.status ?? "active"} />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("outstanding")}</p>
                    <p className="text-lg font-semibold">{formatMoney(outstanding, "AED", lang)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {mine.length} {t("invoices").toLowerCase()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}