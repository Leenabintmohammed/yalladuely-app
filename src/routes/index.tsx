import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Bot,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileBarChart,
  FileText,
  Landmark,
  MessageSquare,
  PieChart,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Duely — Your AI financial employee",
      },
      {
        name: "description",
        content:
          "Duely handles invoices, payments, follow-ups and financial operations through natural language.",
      },
      {
        property: "og:title",
        content: "Duely — Your AI financial employee",
      },
      {
        property: "og:description",
        content:
          "Tell Duely what happened. It understands, acts and keeps your financial operations moving.",
      },
    ],
  }),
  component: Landing,
});

const availableFeatures = [
  {
    icon: FileText,
    number: "01",
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
    icon: MessageSquare,
    number: "02",
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
    icon: Sparkles,
    number: "03",
    title: "Understand Customer Replies",
    description:
      "Duely understands what your customer means and recommends what should happen next.",
    items: [
      "Understand customer responses",
      "Identify what the customer means",
      "Recommend the best next action",
      "Suggest the right response",
    ],
  },
  {
    icon: BarChart3,
    number: "04",
    title: "Daily Business Summary",
    description:
      "Know what happened during the day and exactly what needs your attention.",
    items: [
      "See which invoices were paid",
      "Know which invoices are overdue",
      "See customer replies and pending follow-ups",
      "Get a clear list of what needs your attention",
    ],
  },
];

const comingSoon = [
  {
    icon: Landmark,
    title: "Banking Operations",
    description:
      "Bring your business banking into Duely and automate the financial work around your transactions.",
    items: [
      "Connect business bank accounts",
      "Track and categorize transactions",
      "Automatically match payments with invoices",
      "Automate bank reconciliation",
    ],
  },
  {
    icon: CreditCard,
    title: "Payments & Installments",
    description:
      "Give customers flexible ways to pay while keeping payment tracking automatic.",
    items: [
      "Payment links",
      "Recurring payments",
      "Flexible installment plans",
      "Automatic payment tracking",
    ],
  },
  {
    icon: Receipt,
    title: "Tax Management",
    description:
      "Keep tax information organized and turn tax compliance into an automated workflow.",
    items: [
      "VAT tracking",
      "Tax-ready reports",
      "Tax deadlines and reminders",
      "Automated tax workflows",
    ],
  },
  {
    icon: Wallet,
    title: "Cash Flow Intelligence",
    description:
      "Understand where your business stands today and what its financial future may look like.",
    items: [
      "Real-time cash flow overview",
      "Cash flow forecasting",
      "Predict upcoming cash shortages",
      "Identify financial risks",
    ],
  },
  {
    icon: Bot,
    title: "AI Financial Advisor",
    description:
      "Move beyond reporting. Duely analyzes your business and helps you make better financial decisions.",
    items: [
      "Analyze business financial activity",
      "Identify financial problems",
      "Recommend actions",
      "Provide financial insights",
    ],
  },
  {
    icon: Users,
    title: "AI Employees",
    description:
      "Build a team of specialized AI employees that work together across your business.",
    items: [
      "AI Sales Employee",
      "AI Customer Support Employee",
      "AI Finance Employee",
      "AI Operations Employee",
    ],
  },
  {
    icon: FileBarChart,
    title: "Advanced Financial Reporting",
    description:
      "Turn business activity into financial intelligence with dashboards, KPIs and automated reporting.",
    items: [
      "Financial dashboards",
      "KPIs and performance insights",
      "Revenue and expense analysis",
      "Automated financial reports",
    ],
  },
  {
    icon: Building2,
    title: "Multi-Company Management",
    description:
      "Run multiple businesses and branches through one centralized AI financial system.",
    items: [
      "Manage multiple businesses",
      "Manage branches",
      "Centralized financial operations",
      "One AI system across your businesses",
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

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-24rem] h-[45rem] w-[45rem] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-[150px]" />
        <div className="absolute right-[-15rem] top-[50rem] h-[35rem] w-[35rem] rounded-full bg-emerald-500/[0.04] blur-[130px]" />
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
            className="hidden text-white/50 hover:bg-white/5 hover:text-white sm:inline-flex"
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

        {/* ========================================================= */}
        {/* HERO */}
        {/* ========================================================= */}

        <section className="mx-auto max-w-7xl px-6 pb-28 pt-20 lg:px-8 lg:pb-36 lg:pt-28">

          <div className="mx-auto max-w-5xl text-center">

            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-xs font-medium text-emerald-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>

              AI-native financial operations
            </div>

            <h1 className="text-balance text-5xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-8xl">
              Your business has
              <br />
              a financial employee.
              <br />
              <span className="text-emerald-400">
                Now.
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-balance text-base leading-7 text-white/50 sm:text-lg">
              Duely understands what is happening in your business, takes
              action, follows up with customers and keeps your financial
              operations moving.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">

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

              <span className="text-xs text-white/30">
                English or Arabic. Just talk.
              </span>

            </div>
          </div>

          {/* Product preview */}

          <div className="relative mx-auto mt-20 max-w-5xl">

            <div className="absolute inset-x-20 -bottom-16 h-40 rounded-full bg-emerald-400/10 blur-[100px]" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#090c0a] shadow-2xl shadow-black/50">

              <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">

                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-white/10" />
                  <span className="size-2.5 rounded-full bg-white/10" />
                  <span className="size-2.5 rounded-full bg-white/10" />
                </div>

                <span className="text-[10px] tracking-[0.2em] text-white/20">
                  DUELY
                </span>

                <div className="w-10" />

              </div>

              <div className="grid min-h-[410px] md:grid-cols-[190px_1fr]">

                {/* Sidebar */}

                <div className="hidden border-r border-white/10 p-4 md:block">

                  <div className="mb-8 flex items-center gap-2">

                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-400/10">
                      <Sparkles className="size-3.5 text-emerald-400" />
                    </div>

                    <span className="text-sm font-semibold">
                      Duely
                    </span>

                  </div>

                  <div className="space-y-1 text-xs">

                    <div className="rounded-lg bg-white/5 px-3 py-2">
                      Overview
                    </div>

                    <div className="px-3 py-2 text-white/25">
                      Invoices
                    </div>

                    <div className="px-3 py-2 text-white/25">
                      Customers
                    </div>

                    <div className="px-3 py-2 text-white/25">
                      Activity
                    </div>

                  </div>

                </div>

                {/* Chat */}

                <div className="flex flex-col">

                  <div className="border-b border-white/10 px-5 py-4">

                    <div className="text-sm font-medium">
                      Good morning.
                    </div>

                    <div className="mt-1 text-xs text-white/30">
                      Here is what needs your attention.
                    </div>

                  </div>

                  <div className="flex-1 space-y-4 p-5">

                    <div className="max-w-md rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.025] p-4">

                      <div className="text-xs text-white/25">
                        You
                      </div>

                      <p className="mt-2 text-sm text-white/75">
                        Create an invoice for ABC for AED 12,000 due in
                        30 days.
                      </p>

                    </div>

                    <div className="ml-auto max-w-md rounded-2xl rounded-tr-md border border-emerald-400/20 bg-emerald-400/[0.06] p-4">

                      <div className="flex items-center gap-2 text-xs text-emerald-300">
                        <Sparkles className="size-3" />
                        Duely
                      </div>

                      <p className="mt-2 text-sm leading-6 text-white/75">
                        Invoice INV-001 created for ABC for AED 12,000,
                        payable in 30 days.
                      </p>

                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-black/20 px-3 py-2 text-xs text-emerald-300">
                        <ShieldCheck className="size-3.5" />
                        Waiting for your approval
                      </div>

                    </div>

                  </div>

                  <div className="border-t border-white/10 p-4">

                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">

                      <span className="flex-1 text-xs text-white/20">
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

        </section>

        {/* ========================================================= */}
        {/* POSITIONING */}
        {/* ========================================================= */}

        <section className="border-y border-white/10 bg-white/[0.015]">

          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-28">

            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">

              <div>

                <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                  The idea
                </p>

                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                  Don't operate software.
                  <br />
                  <span className="text-white/40">
                    Tell your employee what to do.
                  </span>
                </h2>

              </div>

              <p className="max-w-xl text-lg leading-8 text-white/45">
                Duely is built around a simple idea: financial operations
                should feel like a conversation, not a collection of
                dashboards, forms and repetitive tasks.
              </p>

            </div>

          </div>

        </section>

        {/* ========================================================= */}
        {/* AVAILABLE NOW */}
        {/* ========================================================= */}

        <section className="mx-auto max-w-7xl px-6 py-28 lg:px-8 lg:py-36">

          <div className="max-w-2xl">

            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
              Available now
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              The work Duely can take off your plate today.
            </h2>

            <p className="mt-5 text-base leading-7 text-white/40">
              Start with the financial operations that consume your time
              today. Duely handles the repetitive work while you stay in
              control.
            </p>

          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-2">

            {availableFeatures.map((feature) => {

              const Icon = feature.icon;

              return (
                <div
                  key={feature.number}
                  className="group rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition hover:border-emerald-400/20 hover:bg-emerald-400/[0.025]"
                >

                  <div className="flex items-center justify-between">

                    <div className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06]">
                      <Icon className="size-5 text-emerald-400" />
                    </div>

                    <span className="text-xs text-white/15">
                      {feature.number}
                    </span>

                  </div>

                  <h3 className="mt-7 text-xl font-medium">
                    {feature.title}
                  </h3>

                  <p className="mt-3 max-w-md text-sm leading-6 text-white/40">
                    {feature.description}
                  </p>

                  <div className="mt-7 space-y-3">

                    {feature.items.map((item) => (

                      <div
                        key={item}
                        className="flex items-start gap-3 text-sm text-white/60"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        {item}
                      </div>

                    ))}

                  </div>

                </div>
              );

            })}

          </div>

        </section>

        {/* ========================================================= */}
        {/* WORKFLOW */}
        {/* ========================================================= */}

        <section className="border-y border-white/10 bg-white/[0.015]">

          <div className="mx-auto max-w-7xl px-6 py-28 lg:px-8">

            <div className="text-center">

              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                One conversation
              </p>

              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                From invoice to payment.
                <br />
                Without the busywork.
              </h2>

            </div>

            <div className="mt-16 grid gap-4 md:grid-cols-4">

              {[
                {
                  icon: FileText,
                  title: "Create",
                  text: "Tell Duely what you need.",
                },
                {
                  icon: Clock3,
                  title: "Follow up",
                  text: "Duely follows up at the right time.",
                },
                {
                  icon: MessageSquare,
                  title: "Understand",
                  text: "Customer replies are understood.",
                },
                {
                  icon: CircleDollarSign,
                  title: "Get paid",
                  text: "Payments and actions stay on track.",
                },
              ].map((item, index) => {

                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-[#080b09] p-6"
                  >

                    <div className="flex items-center justify-between">

                      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/10">
                        <Icon className="size-4 text-emerald-400" />
                      </div>

                      <span className="text-xs text-white/15">
                        0{index + 1}
                      </span>

                    </div>

                    <h3 className="mt-7 font-medium">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-white/35">
                      {item.text}
                    </p>

                  </div>
                );

              })}

            </div>

          </div>

        </section>

        {/* ========================================================= */}
        {/* COMING SOON INTRO */}
        {/* ========================================================= */}

        <section className="relative mx-auto max-w-7xl px-6 pb-16 pt-32 lg:px-8 lg:pb-20 lg:pt-40">

          <div className="absolute left-1/2 top-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400/[0.05] blur-[120px]" />

          <div className="mx-auto max-w-4xl text-center">

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/60">

              <Sparkles className="size-3.5 text-emerald-400" />

              Coming soon

            </div>

            <h2 className="mt-7 text-5xl font-semibold tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              This is only
              <br />
              <span className="text-emerald-400">
                the beginning.
              </span>
            </h2>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/40 sm:text-lg">
              Duely starts with invoices and financial operations.
              Over time, it will become the AI system that understands,
              manages and operates your entire business.
            </p>

          </div>

        </section>

        {/* ========================================================= */}
        {/* COMING SOON GRID */}
        {/* ========================================================= */}

        <section className="mx-auto max-w-7xl px-6 pb-32 lg:px-8 lg:pb-40">

          <div className="grid gap-4 md:grid-cols-2">

            {comingSoon.map((feature, index) => {

              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#080b09] p-7 transition-all duration-300 hover:border-emerald-400/20 hover:bg-[#0a0f0c] lg:p-9"
                >

                  {/* Number */}

                  <div className="absolute right-7 top-7 text-xs text-white/10">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  {/* Icon */}

                  <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition group-hover:border-emerald-400/20 group-hover:bg-emerald-400/[0.06]">
                    <Icon className="size-5 text-emerald-400" />
                  </div>

                  <h3 className="mt-7 text-xl font-medium tracking-tight">
                    {feature.title}
                  </h3>

                  <p className="mt-3 max-w-lg text-sm leading-6 text-white/40">
                    {feature.description}
                  </p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">

                    {feature.items.map((item) => (

                      <div
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-white/50"
                      >
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400/60" />
                        {item}
                      </div>

                    ))}

                  </div>

                  <div className="mt-8 flex items-center gap-2 text-xs font-medium text-emerald-400/60">
                    Coming soon
                    <ChevronRight className="size-3.5" />
                  </div>

                </div>
              );

            })}

          </div>

        </section>

        {/* ========================================================= */}
        {/* AI EMPLOYEES FEATURE */}
        {/* ========================================================= */}

        <section className="border-y border-white/10 bg-white/[0.015]">

          <div className="mx-auto max-w-7xl px-6 py-28 lg:px-8 lg:py-36">

            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

              <div>

                <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                  The bigger vision
                </p>

                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                  One AI.
                  <br />
                  A team of employees.
                </h2>

                <p className="mt-6 max-w-xl text-base leading-7 text-white/40">
                  Instead of adding another collection of disconnected
                  software, Duely is designed to become an intelligent
                  workforce for your business.
                </p>

                <div className="mt-9 space-y-3">

                  {[
                    "AI Sales Employee",
                    "AI Customer Support Employee",
                    "AI Finance Employee",
                    "AI Operations Employee",
                  ].map((employee) => (

                    <div
                      key={employee}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                    >

                      <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/10">
                        <Bot className="size-4 text-emerald-400" />
                      </div>

                      <span className="text-sm text-white/70">
                        {employee}
                      </span>

                      <span className="ml-auto text-[10px] uppercase tracking-wider text-white/20">
                        Soon
                      </span>

                    </div>

                  ))}

                </div>

              </div>

              {/* AI architecture visual */}

              <div className="relative">

                <div className="absolute inset-0 rounded-full bg-emerald-400/[0.05] blur-[100px]" />

                <div className="relative rounded-3xl border border-white/10 bg-[#080b09] p-6 sm:p-8">

                  <div className="flex flex-col items-center">

                    <div className="flex size-24 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.08] shadow-[0_0_60px_rgba(52,211,153,0.08)]">

                      <Sparkles className="size-9 text-emerald-400" />

                    </div>

                    <div className="mt-4 text-sm font-medium">
                      Duely AI
                    </div>

                    <div className="mt-1 text-xs text-white/25">
                      One intelligence layer
                    </div>

                    <div className="my-7 h-10 w-px bg-white/10" />

                    <div className="grid w-full grid-cols-2 gap-3">

                      {[
                        "Sales",
                        "Support",
                        "Finance",
                        "Operations",
                      ].map((name) => (

                        <div
                          key={name}
                          className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-center"
                        >

                          <Bot className="mx-auto size-4 text-emerald-400/70" />

                          <div className="mt-3 text-xs text-white/50">
                            AI {name}
                          </div>

                        </div>

                      ))}

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ========================================================= */}
        {/* CONTROL */}
        {/* ========================================================= */}

        <section className="mx-auto max-w-7xl px-6 py-28 lg:px-8 lg:py-36">

          <div className="mx-auto max-w-3xl text-center">

            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
              <ShieldCheck className="size-5 text-emerald-400" />
            </div>

            <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
              You stay in control
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              AI can act.
              <br />
              You decide what leaves your business.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/40">
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

        {/* ========================================================= */}
        {/* LANGUAGE */}
        {/* ========================================================= */}

        <section className="border-y border-white/10 bg-white/[0.015]">

          <div className="mx-auto max-w-7xl px-6 py-24 text-center lg:px-8">

            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
              Speak naturally
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em]">
              English or Arabic.
              <br />
              Just tell Duely what happened.
            </h2>

            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">

              <div className="rounded-2xl border border-white/10 bg-[#080b09] p-5 text-left">

                <div className="text-[10px] uppercase tracking-wider text-white/20">
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

                <div className="text-[10px] uppercase tracking-wider text-white/20">
                  العربية
                </div>

                <div className="mt-3 text-sm text-white/65">
                  “ABC دفع 5 آلاف درهم.”
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ========================================================= */}
        {/* FINAL CTA */}
        {/* ========================================================= */}

        <section className="relative mx-auto max-w-7xl px-6 py-32 lg:px-8 lg:py-40">

          <div className="absolute inset-x-1/4 top-1/2 -z-10 h-40 -translate-y-1/2 rounded-full bg-emerald-400/[0.08] blur-[100px]" />

          <div className="mx-auto max-w-3xl text-center">

            <Sparkles className="mx-auto size-7 text-emerald-400" />

            <h2 className="mt-7 text-5xl font-semibold tracking-[-0.06em] sm:text-6xl">
              Stop managing
              <br />
              the busywork.
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/40">
              Tell Duely what happened. Let your AI financial employee
              handle the rest.
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

        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 text-xs text-white/25 sm:flex-row sm:items-center sm:justify-between lg:px-8">

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
