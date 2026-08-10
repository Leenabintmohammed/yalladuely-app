import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useProfile, usePolicies } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { useDuely } from "@/lib/duely-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Duely" },
      { name: "description", content: "Business profile, language and AI autonomy policies." },
      { property: "og:title", content: "Settings — Duely" },
      { property: "og:description", content: "Business profile, language and AI autonomy policies." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { setPage } = useDuely();
  const profile = useProfile();
  const policies = usePolicies();
  useEffect(() => setPage("settings"), [setPage]);

  return (
    <div className="max-w-2xl space-y-6 p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("settings")}</h1>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">{lang === "ar" ? "الملف التجاري" : "Business profile"}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          {[
            [lang === "ar" ? "الاسم" : "Name", profile.data?.full_name ?? "—"],
            [lang === "ar" ? "الشركة" : "Company", profile.data?.company_name ?? "—"],
            [lang === "ar" ? "البريد" : "Email", profile.data?.email ?? "—"],
            [lang === "ar" ? "العملة" : "Currency", profile.data?.currency ?? "AED"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-4">
              <dt className="w-32 shrink-0 text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {lang === "ar"
            ? "لتحديث أي شيء، اطلب من ديولي في المحادثة."
            : "To change anything, just ask Duely in the chat."}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">{t("language")}</h2>
        <div className="mt-3 flex gap-2">
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                lang === l ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {l === "en" ? "English" : "العربية"}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">{lang === "ar" ? "استقلالية الذكاء" : "AI autonomy"}</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(policies.data ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{p.policy_key.replace(/_/g, " ")}</span>
              <span className="font-medium">{String(p.policy_value)}</span>
            </li>
          ))}
          {(policies.data ?? []).length === 0 && (
            <li className="text-muted-foreground">
              {lang === "ar" ? "الإعدادات الافتراضية مفعلة." : "Running on safe defaults: sending needs your approval."}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}