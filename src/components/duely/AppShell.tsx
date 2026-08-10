import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, FileText, LayoutDashboard, LogOut, Settings, Sparkle, Users, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CommandCenter } from "./CommandCenter";
import { useDuely } from "@/lib/duely-context";
import { useI18n, type TKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav: { to: string; key: TKey; icon: typeof LayoutDashboard }[] = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/clients", key: "clients", icon: Users },
  { to: "/invoices", key: "invoices", icon: FileText },
  { to: "/payments", key: "payments", icon: Wallet },
  { to: "/ai-activity", key: "ai_activity", icon: BarChart3 },
  { to: "/settings", key: "settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { aiOpen, setAiOpen } = useDuely();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [navOpen, setNavOpen] = useState(false);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 z-40 flex w-60 flex-col border-e border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0",
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkle className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Duely</span>
          <button className="ms-auto lg:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu">
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setNavOpen(false)}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <item.icon className="size-4" />
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border p-3">
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {(["en", "ar"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "flex-1 rounded-md py-1 text-xs font-medium transition-colors",
                  lang === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {l === "en" ? "English" : "العربية"}
              </button>
            ))}
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-4" />
            {t("sign_out")}
          </button>
        </div>
      </aside>

      {navOpen && <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
        <main className="duely-scroll min-w-0 flex-1 overflow-y-auto pb-24 lg:pb-0">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
            <button onClick={() => setNavOpen(true)} aria-label="Open menu" className="text-muted-foreground">
              <LayoutDashboard className="size-5" />
            </button>
            <span className="font-semibold">Duely</span>
          </div>
          {children}
        </main>

        <aside className="hidden w-[32%] max-w-[460px] min-w-[340px] border-s border-border lg:block">
          <CommandCenter className="h-screen" />
        </aside>
      </div>

      <Button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-5 end-5 z-40 h-12 gap-2 rounded-full px-5 shadow-lg lg:hidden"
      >
        <Sparkle className="size-4" />
        {t("duely_ai")}
      </Button>

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-foreground/30 lg:hidden">
          <div className="h-[85vh] overflow-hidden rounded-t-2xl bg-sidebar">
            <div className="flex justify-end px-4 pt-3">
              <button onClick={() => setAiOpen(false)} aria-label="Close assistant">
                <X className="size-5 text-muted-foreground" />
              </button>
            </div>
            <CommandCenter className="h-[calc(85vh-2.5rem)]" />
          </div>
        </div>
      )}
    </div>
  );
}