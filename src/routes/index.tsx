import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileText,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duely — AI financial operations for freelancers & SME" },
      {
        name: "description",
        content:
          "Duely runs your clients, invoices, payments and reminders through one chat. Talk to it in English or Arabic.",
      },
      {
        property: "og:title",
        content: "Duely — AI financial operations",
      },
      {
        property: "og:description",
        content:
          "Stop learning accounting software. Just tell Duely what happened and it handles the rest.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: MessageSquare,
    title: "Chat is the product",
    body: "No forms to hunt through. Say what happened; Duely does the bookkeeping.",
  },
  {
    icon: Zap,
    title: "It acts, not just answers",
    body: "Creates clients, issues invoices, records payments and chases late money.",
  },
  {
    icon: ShieldCheck,
    title: "You stay in control",
    body: "Anything that leaves your business waits for your approval first.",
  },
];

const capabilities = [
  {
    number: "01",
    icon: FileText,
    title: "Create & Send Invoices",
    description:
      "Create invoices using simple instructions and let Duely handle the process.",
    items: [
      "Create invoices with natural language",
      "Automatically send invoices to customers",
      "Track invoice status",
    ],
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "Automated WhatsApp Follow-ups",
    description:
      "Stop manually chasing unpaid invoices. Duely follows up at the right time.",
    items: [
      "Automatically follow up on unpaid invoices",
      "Choose the right time to follow up",
      "Send personalized WhatsApp messages",
    ],
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Understand Customer Replies",
    description:
      "Duely understands what your customer means and helps decide what happens next.",
    items: [
      "Understand customer responses",
      "Identify what the customer means",
      "Recommend the best next action",
      "Suggest the right response",
    ],
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Daily Business Summary",
    description:
      "Start and finish your day knowing exactly what happened in your business.",
    items: [
      "See which invoices were paid",
      "Know which invoices are overdue",
      "See customer replies and pending follow-ups",
      "Get a clear list of what needs your attention",
    ],
  },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });
  }, []);

  const authPath = signedIn ? "/dashboard" : "/auth";

  return (
    <div className="min-h-screen overflow-hidden bg-[#050706] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20rem] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute right-[-15rem] top-[35rem] h-[30rem] w-[30rem] rounded-full bg-emerald-400/5 blur-[120px]" />
      </div>

      {/* Navigation */}
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
            <Sparkles className="size-4 text-emerald-400" />
          </div>

          <span className="text-xl font-semibold tracking-[-0.03em]">
            Duely
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            className="hidden text-white/60 hover:bg-white/5 hover:text-white sm:inline-flex"
          >
            <Link to="/auth">Sign in</Link>
          </Button>

          <Button
            asChild
            className="rounded-full bg-white px-5 text-black hover:bg-white/90"
          >
            <Link to={authPath}>
              {signedIn ? "Open Duely" : "Start free"}
            </Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2 text-xs font-medium text-emerald-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              AI-native financial operations
            </div>

            <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-8xl">
              You don't learn
              <br />
              accounting software.
              <br />
              <span className="text-emerald-400">You just talk.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-balance text-base leading-7 text-white/55 sm:text-lg">
              Duely is the financial brain for freelancers and small
              businesses. Tell it what happened — in English or Arabic — and
              your clients, invoices, payments and reminders take care of
              themselves.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-emerald-400 px-7 text-black hover:bg-emerald-300"
              >
                <Link to={authPath}>
                  {signedIn ? "Open your workspace" : "Start free"}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>

              <span className="text-xs text-white/35">
                No accounting software to learn.
              </span>
            </div>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto mt-20 max-w-5xl">
            <div className="absolute inset-x-20 -bottom-10 h-32 rounded-full bg-emerald-400/10 blur-[80px]" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e0c] shadow-2xl shadow-black/50">
              {/* Window bar */}
              <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                </div>

                <div className="text-[10px] tracking-wide text-white/25">
                  DUELY WORKSPACE
                </div>

                <div className="w-10" />
              </div>

              <div className="grid min-h-[390px] md:grid-cols-[190px_1fr]">
                {/* Sidebar */}
                <div className="hidden border-r border-white/10 p-4 md:block">
                  <div className="mb-8 flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-400/10">
                      <Sparkles className="size-3.5 text-emerald-400" />
                    </div>
                    <span className="text-sm font-semibold">Duely</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="rounded-lg bg-white/5 px-3 py-2 text-white">
                      Overview
                    </div>
                    <div className="px-3 py-2 text-white/35">Invoices</div>
                    <div className="px-3 py-2 text-white/35">Customers</div>
                    <div className="px-3 py-2 text-white/35">Activity</div>
                  </div>
                </div>

                {/* Chat */}
                <div className="flex flex-col">
                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="text-sm font-medium">Good morning.</div>
                    <div className="mt-1 text-xs text-white/35">
                      Here is what needs your attention.
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 p-5">
                    <div className="max-w-md rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-white/35">You</div>
                      <p className="mt-2 text-sm text-white/80">
                        Create an invoice for ABC for AED 12,000 due in 30
                        days.
                      </p>
                    </div>

                    <div className="ml-auto max-w-md rounded-2xl rounded-tr-md border border-emerald-400/20 bg-emerald-400/[0.07] p-4">
                      <div className="flex items-center gap-2 text-xs text-emerald-300">
                        <Sparkles className="size-3" />
                        Duely
                      </div>

                      <p className="mt-2 text-sm leading-6 text-white/80">
                        Invoice INV-001 created for ABC for AED 12,000,
                        payable in 30 days.
                      </p>

                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-black/20 px-3 py-2 text-xs text-emerald-300">
                        <ShieldCheck className="size-3.5" />
                        Waiting for your approval before sending
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 p-4">
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <span className="flex-1 text-xs text-white/25">
                        Tell Duely what happened...
                      </span>
                      <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-400 text-black">
                        <ArrowRight className="size-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example prompts */}
          <div className="mx-auto mt-7 grid max-w-5xl gap-3 sm:grid-cols-3">
            {[
              "Create an invoice for ABC for AED 12,000 due in 30 days.",
              "Who owes me money?",
              "ABC دفع 5 آلاف درهم.",
            ].map((prompt) => (
              <div
                key={prompt}
                className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left text-xs leading-5 text-white/40"
              >
                “{prompt}”
              </div>
            ))}
          </div>
        </section>

        {/* Positioning */}
        <section className="border-y border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                  Your financial employee
                </p>

                <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  Your business has a financial employee now.
                </h2>
              </div>

              <p className="max-w-xl text-lg leading-8 text-white/45">
                Duely does not just show you numbers. It understands what is
                happening, takes action, follows up, and tells you when
                something needs your attention.
              </p>
            </div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="bg-[#080b09] p-7 transition-colors hover:bg-[#0c110e]"
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.07]">
                      <Icon className="size-4 text-emerald-400" />
                    </div>

                    <h3 className="mt-6 text-lg font-medium">
                      {feature.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-white/40">
                      {feature.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What's available now */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
              What's available now
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              The work Duely can take off your plate.
            </h2>

            <p className="mt-5 text-base leading-7 text-white/45">
              Start with the financial operations that consume your time
              today. Duely handles the repetitive work while you stay in
              control.
            </p>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {capabilities.map((capability) => {
              const Icon = capability.icon;

              return (
                <div
                  key={capability.number}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition-all hover:border-emerald-400/20 hover:bg-emerald-400/[0.025] lg:p-8"
                >
                  <div className="absolute right-7 top-7 text-xs font-medium text-white/15">
                    {capability.number}
                  </div>

                  <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <Icon className="size-5 text-emerald-400" />
                  </div>

                  <h3 className="mt-7 text-xl font-medium tracking-tight">
                    {capability.title}
                  </h3>

                  <p className="mt-3 max-w-md text-sm leading-6 text-white/40">
                    {capability.description}
                  </p>

                  <div className="mt-7 space-y-3">
                    {capability.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 text-sm text-white/65"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Workflow */}
        <section className="border-y border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                One conversation
              </p>

              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                From “invoice this client” to “they paid.”
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/40">
                Duely connects the steps that normally live across different
                tools, spreadsheets and messages.
              </p>
            </div>

            <div className="mt-16 grid gap-4 md:grid-cols-4">
              {[
                {
                  icon: FileText,
                  step: "01",
                  title: "Invoice",
                  text: "Tell Duely what to invoice.",
                },
                {
                  icon: Clock3,
                  step: "02",
                  title: "Follow up",
                  text: "Duely follows up when payment is due.",
                },
                {
                  icon: MessageSquare,
                  step: "03",
                  title: "Understand",
                  text: "Customer replies are understood.",
                },
                {
                  icon: CircleCheck,
                  step: "04",
                  title: "Act",
                  text: "Duely recommends or executes the next action.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.step}
                    className="relative rounded-2xl border border-white/10 bg-[#080b09] p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/10">
                        <Icon className="size-4 text-emerald-400" />
                      </div>

                      <span className="text-xs text-white/20">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="mt-7 font-medium">{item.title}</h3>

                    <p className="mt-2 text-sm leading-6 text-white/40">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI employee */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                AI-powered actions
              </p>

              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Don't operate the software.
                <br />
                Tell it what to do.
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/45">
                Tell your AI employee what you want in natural language. Duely
                can create and execute tasks, automate repetitive financial
                operations and recommend what you should do next.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Tell Duely what you want in natural language.",
                  "Let AI create and execute tasks.",
                  "Automate repetitive financial operations.",
                  "Get recommendations on what to do next.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-white/70"
                  >
                    <div className="flex size-6 items-center justify-center rounded-full bg-emerald-400/10">
                      <Check className="size-3.5 text-emerald-400" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* AI action console */}
            <div className="relative">
              <div className="absolute -inset-10 rounded-full bg-emerald-400/5 blur-[80px]" />

              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#080b09]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-400/10">
                      <Sparkles className="size-3.5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium">Duely AI</span>
                  </div>

                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </div>

                <div className="space-y-5 p-5">
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                    <p className="text-[10px] uppercase tracking-wider text-white/25">
                      You
                    </p>
                    <p className="mt-2 text-sm text-white/75">
                      Check unpaid invoices and follow up with anyone who is
                      overdue.
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
                    <p className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-400">
                      <Sparkles className="size-3" />
                      Duely
                    </p>

                    <p className="mt-2 text-sm leading-6 text-white/70">
                      I found 3 overdue invoices. I prepared personalized
                      WhatsApp follow-ups and selected the recommended timing
                      for each customer.
                    </p>

                    <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/45">
                          Recommended action
                        </span>
                        <ChevronRight className="size-3.5 text-white/25" />
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs text-emerald-300">
                        <MessageSquare className="size-3.5" />
                        Review WhatsApp follow-ups
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Daily summary */}
        <section className="border-y border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
            <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                  Daily business summary
                </p>

                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  Know what happened.
                  <br />
                  Know what matters.
                </h2>

                <p className="mt-6 max-w-lg text-base leading-7 text-white/45">
                  Instead of opening five different systems, get a clear
                  summary of your financial activity and exactly what needs
                  your attention.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080b09]">
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="text-sm font-medium">
                    Your daily summary
                  </div>
                  <div className="mt-1 text-xs text-white/30">
                    Thursday, August 20
                  </div>
                </div>

                <div className="grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  {[
                    {
                      icon: Wallet,
                      value: "AED 18,500",
                      label: "Payments received",
                    },
                    {
                      icon: FileText,
                      value: "4",
                      label: "Invoices active",
                    },
                    {
                      icon: Clock3,
                      value: "3",
                      label: "Overdue",
                    },
                    {
                      icon: MessageSquare,
                      value: "2",
                      label: "Customer replies",
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className="p-6">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-white/[0.04]">
                          <Icon className="size-4 text-emerald-400" />
                        </div>

                        <div className="mt-5 text-2xl font-semibold tracking-tight">
                          {item.value}
                        </div>

                        <div className="mt-1 text-xs text-white/35">
                          {item.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-white/10 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-emerald-400/10">
                      <Zap className="size-3.5 text-emerald-400" />
                    </div>

                    <div>
                      <div className="text-xs font-medium">
                        What needs your attention
                      </div>
                      <div className="mt-1 text-xs text-white/30">
                        3 overdue invoices and 2 customer replies
                      </div>
                    </div>

                    <ArrowRight className="ml-auto size-4 text-white/20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Control */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
              <ShieldCheck className="size-5 text-emerald-400" />
            </div>

            <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
              You stay in control
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              AI can act.
              <br />
              You decide what leaves your business.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/45">
              Duely is designed around controlled automation. Actions that
              communicate externally can wait for your approval before they
              are sent.
            </p>

            <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-5 py-3 text-sm text-emerald-200">
              <ShieldCheck className="size-4 text-emerald-400" />
              Approval before external sending
            </div>
          </div>
        </section>

        {/* Language */}
        <section className="border-y border-white/10 bg-white/[0.015]">
          <div className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-8 lg:py-24">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
              Speak naturally
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              English or Arabic.
              <br />
              Just tell Duely what happened.
            </h2>

            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#080b09] p-5 text-left">
                <div className="text-[10px] uppercase tracking-wider text-white/25">
                  English
                </div>
                <div className="mt-3 text-sm text-white/65">
                  “ABC paid AED 5,000.”
                </div>
              </div>

              <div
                dir="rtl"
                className="rounded-2xl border border-white/10 bg-[#080b09] p-5 text-right"
              >
                <div className="text-[10px] uppercase tracking-wider text-white/25">
                  العربية
                </div>
                <div className="mt-3 text-sm text-white/65">
                  “ABC دفع 5 آلاف درهم.”
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative mx-auto max-w-7xl px-6 py-28 lg:px-8 lg:py-36">
          <div className="absolute inset-x-1/4 top-1/2 -z-10 h-40 -translate-y-1/2 rounded-full bg-emerald-400/10 blur-[100px]" />

          <div className="mx-auto max-w-3xl text-center">
            <Sparkles className="mx-auto size-7 text-emerald-400" />

            <h2 className="mt-7 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
              Your business is busy.
              <br />
              Let Duely handle the busywork.
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/40">
              Stop learning accounting software. Just tell Duely what
              happened and let your financial operations take care of
              themselves.
            </p>

            <div className="mt-9">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-emerald-400 px-8 text-black hover:bg-emerald-300"
              >
                <Link to={authPath}>
                  {signedIn ? "Open your workspace" : "Start free"}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-400/10">
              <Sparkles className="size-3.5 text-emerald-400" />
            </div>

            <span>Duely</span>
          </div>

          <div>
            © {new Date().getFullYear()} Duely — AI financial employee.
          </div>
        </div>
      </footer>
    </div>
  );
}

