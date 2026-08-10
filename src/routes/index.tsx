import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageSquare, ShieldCheck, Sparkle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duely — AI financial operations for freelancers" },
      {
        name: "description",
        content:
          "Duely runs your clients, invoices, payments and reminders through one chat. Talk to it in English or Arabic.",
      },
      { property: "og:title", content: "Duely — AI financial operations" },
      {
        property: "og:description",
        content: "Stop learning accounting software. Just tell Duely what happened and it handles the rest.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: MessageSquare, title: "Chat is the product", body: "No forms to hunt through. Say what happened; Duely does the bookkeeping." },
  { icon: Zap, title: "It acts, not just answers", body: "Creates clients, issues invoices, records payments and chases late money." },
  { icon: ShieldCheck, title: "You stay in control", body: "Anything that leaves your business waits for your approval first." },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkle className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Duely</span>
        </div>
        <Button asChild variant={signedIn ? "default" : "outline"}>
          <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Open Duely" : "Sign in"}</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 lg:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-foreground">
            <Sparkle className="size-3" /> AI-native financial operations
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance lg:text-6xl">
            You don't learn accounting software. You just <span className="text-primary">talk</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Duely is the financial brain for freelancers and small businesses. Tell it what happened — in English or
            Arabic — and your clients, invoices, payments and reminders take care of themselves.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to={signedIn ? "/dashboard" : "/auth"}>
                {signedIn ? "Open your workspace" : "Start free"} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-14 grid gap-3 sm:grid-cols-3">
            {[
              "Create an invoice for ABC for AED 12,000 due in 30 days.",
              "Who owes me money?",
              "ABC دفع 5 آلاف درهم.",
            ].map((s) => (
              <div key={s} className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                “{s}”
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-secondary/50">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title}>
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <f.icon className="size-4" />
                </span>
                <h2 className="mt-4 font-semibold">{f.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Duely — AI financial operations.
      </footer>
    </div>
  );
}
