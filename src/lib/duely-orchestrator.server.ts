import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getDuelyModel, hasAiProvider } from "./ai-provider.server";
import { TOOL_AUTONOMY, executeTool, dashboardSummary, atRiskClients, type ToolCtx } from "./duely-tools.server";
import { syncNotifications } from "./finance.server";

export type PendingAction = {
  id: string;
  tool_name: string;
  intent: string;
  parameters_json: string;
  autonomy_level: string;
  title: string;
  fields: { label: string; value: string }[];
};

export type ChatResult = {
  reply: string;
  pending: PendingAction[];
  performed: { tool: string; autonomy: string; status: string }[];
};

const TITLES: Record<string, string> = {
  send_invoice: "Send Invoice",
  send_reminder: "Send Reminder",
  update_company_policy: "Update Company Policy",
  create_payment_plan: "Create Payment Plan",
  cancel_payment_plan: "Cancel Payment Plan",
  reverse_payment: "Reverse Payment",
};

function describe(params: Record<string, unknown>) {
  return Object.entries(params)
    .slice(0, 6)
    .map(([k, v]) => ({
      label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: typeof v === "object" ? JSON.stringify(v) : String(v),
    }));
}

async function buildContext(
  ctx: ToolCtx,
  page: string,
  focus: { type: string; id: string; summary?: string } | null,
  selection: { type: string; id: string }[],
) {
  const [{ data: profile }, { data: policies }, summary, { data: clients }, notifications, risk] = await Promise.all([
    ctx.supabase.from("profiles").select("*").eq("id", ctx.userId).maybeSingle(),
    ctx.supabase.from("company_policies").select("policy_key,policy_value"),
    dashboardSummary(ctx),
    ctx.supabase.from("clients").select("id,name,company_name,email").limit(50),
    syncNotifications(ctx),
    atRiskClients(ctx),
  ]);

  let focusDetail: unknown = null;
  let memory: unknown[] = [];
  if (focus?.type === "invoice") {
    const { data } = await ctx.supabase
      .from("invoices")
      .select("*, clients(id,name,company_name,email)")
      .eq("id", focus.id)
      .maybeSingle();
    focusDetail = data;
    if (data?.client_id) {
      const { data: m } = await ctx.supabase.from("client_memory").select("*").eq("client_id", data.client_id);
      memory = m ?? [];
    }
  } else if (focus?.type === "client") {
    const { data } = await ctx.supabase.from("clients").select("*").eq("id", focus.id).maybeSingle();
    focusDetail = data;
    const { data: m } = await ctx.supabase.from("client_memory").select("*").eq("client_id", focus.id);
    memory = m ?? [];
  }

  const selectedInvoiceIds = selection.filter((s) => s.type === "invoice").map((s) => s.id);
  const selectedClientIds = selection.filter((s) => s.type === "client").map((s) => s.id);
  const selected: Record<string, unknown> = {};
  if (selectedInvoiceIds.length) {
    const { data } = await ctx.supabase
      .from("invoices")
      .select("id,invoice_number,amount,remaining_balance,currency,status,due_date, clients(id,name)")
      .in("id", selectedInvoiceIds);
    selected['invoices'] = data ?? [];
  }
  if (selectedClientIds.length) {
    const { data } = await ctx.supabase
      .from("clients")
      .select("id,name,company_name,email,status")
      .in("id", selectedClientIds);
    selected['clients'] = data ?? [];
  }

  return {
    user: { id: ctx.userId, name: profile?.full_name, company: profile?.company_name, currency: profile?.currency },
    current_page: page,
    current_focus: focus ? { ...focus, detail: focusDetail } : null,
    current_selection: selection.length ? selected : null,
    company_policies: policies ?? [],
    relevant_client_memory: memory,
    clients_directory: clients ?? [],
    financial_snapshot: summary,
    unread_notifications: (notifications.notifications ?? []).slice(0, 15),
    at_risk_clients: risk.clients,
    today: new Date().toISOString().slice(0, 10),
  };
}

const SYSTEM = `You are Duely AI, the primary operating interface of Duely — an AI-native financial operations assistant for freelancers, agencies and small businesses.

RULES
- You act only through the provided tools. Never claim an action happened unless a tool returned success.
- Never invent clients, invoices, payments, amounts or dates. If data is missing, say so or ask.
- Ask only for genuinely missing information; use company policies for defaults (payment terms, currency, tone).
- Some tools require the owner's approval (send_invoice, send_reminder, update_company_policy). When you call them, the system prepares an approval card — tell the user it is awaiting their approval; never say it was sent.
- Never cancel debt, grant major concessions, handle legal disputes or terminate a client relationship. Explain that these require the owner to act manually.
- External sending is SIMULATED in this version. When something is "sent", state clearly that it is simulated.
- For reminders: call generate_reminder with a complete, professional message you wrote yourself in the requested tone (friendly / professional / firm), in the client's language.
- Reply in the language of the user's message (Arabic or English). Be concise, direct, professional and conversational. Use short lines, no markdown tables.
- Use amounts with their currency code (e.g. AED 12,000).`;

export async function runOrchestrator(args: {
  supabase: SupabaseClient;
  userId: string;
  message: string;
  sessionId: string;
  page: string;
  focus: { type: string; id: string; summary?: string } | null;
  selection?: { type: string; id: string }[];
}): Promise<ChatResult> {
  const ctx: ToolCtx = { supabase: args.supabase, userId: args.userId };
  if (!hasAiProvider()) return { reply: "AI is not configured yet.", pending: [], performed: [] };

  await ctx.supabase.from("ai_conversations").insert({
    owner_id: args.userId,
    session_id: args.sessionId,
    role: "user",
    message: args.message,
    context: { page: args.page, focus: args.focus } as never,
  });

  const { data: history } = await ctx.supabase
    .from("ai_conversations")
    .select("role,message")
    .eq("session_id", args.sessionId)
    .order("created_at", { ascending: true })
    .limit(20);

  const contextObject = await buildContext(ctx, args.page, args.focus, args.selection ?? []);
  const pending: PendingAction[] = [];
  const performed: { tool: string; autonomy: string; status: string }[] = [];

  const makeTool = (name: string, description: string, schema: z.ZodTypeAny) =>
    tool({
      description,
      inputSchema: schema,
      execute: async (input: unknown) => {
        const params = (input ?? {}) as Record<string, unknown>;
        const autonomy = TOOL_AUTONOMY[name] ?? "approval_required";
        if (autonomy === "approval_required") {
          const { data: action } = await ctx.supabase
            .from("ai_actions")
            .insert({
              owner_id: args.userId,
              intent: name,
              tool_name: name,
              parameters: params as never,
              autonomy_level: autonomy,
              confidence: 0.95,
              status: "awaiting_approval",
            })
            .select("*")
            .single();
          if (action) {
            pending.push({
              id: action.id,
              tool_name: name,
              intent: name,
              parameters_json: JSON.stringify(params),
              autonomy_level: autonomy,
              title: TITLES[name] ?? name,
              fields: describe(params),
            });
          }
          performed.push({ tool: name, autonomy, status: "awaiting_approval" });
          return { status: "awaiting_approval", note: "An approval card was shown to the owner." };
        }
        const result = await executeTool(name, params, ctx);
        await ctx.supabase.from("ai_actions").insert({
          owner_id: args.userId,
          intent: name,
          tool_name: name,
          parameters: params as never,
          autonomy_level: autonomy,
          confidence: 0.96,
          status: (result as { error?: string })?.error ? "failed" : "completed",
          result: result as never,
        });
        performed.push({ tool: name, autonomy, status: (result as { error?: string })?.error ? "failed" : "completed" });
        return result;
      },
    });

  const clientRef = {
    client_id: z.string().optional(),
    client_name: z.string().optional(),
  };

  const tools = {
    list_clients: makeTool("list_clients", "List the user's clients", z.object({})),
    get_client: makeTool("get_client", "Get one client by id or name", z.object(clientRef)),
    create_client: makeTool(
      "create_client",
      "Create a new client",
      z.object({
        name: z.string(),
        company_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        billing_address: z.string().optional(),
        preferred_language: z.string().optional(),
        notes: z.string().optional(),
      }),
    ),
    update_client: makeTool(
      "update_client",
      "Update client details",
      z.object({
        ...clientRef,
        name: z.string().optional(),
        company_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        billing_address: z.string().optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
      }),
    ),
    create_invoice: makeTool(
      "create_invoice",
      "Create a draft invoice for a client",
      z.object({
        ...clientRef,
        amount: z.number(),
        currency: z.string().optional(),
        due_in_days: z.number().optional(),
        due_date: z.string().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
      }),
    ),
    update_invoice: makeTool(
      "update_invoice",
      "Update an invoice",
      z.object({
        invoice_id: z.string(),
        amount: z.number().optional(),
        due_date: z.string().optional(),
        notes: z.string().optional(),
      }),
    ),
    get_invoice: makeTool(
      "get_invoice",
      "Get one invoice by id or invoice number",
      z.object({ invoice_id: z.string().optional(), invoice_number: z.string().optional() }),
    ),
    list_invoices: makeTool(
      "list_invoices",
      "List invoices, optionally filtered by status or client",
      z.object({ status: z.string().optional(), client_id: z.string().optional() }),
    ),
    send_invoice: makeTool(
      "send_invoice",
      "Send an invoice to the client (requires owner approval, simulated sending)",
      z.object({ invoice_id: z.string() }),
    ),
    record_payment: makeTool(
      "record_payment",
      "Record a payment received against an invoice",
      z.object({
        ...clientRef,
        invoice_id: z.string().optional(),
        amount: z.number(),
        payment_date: z.string().optional(),
        payment_method: z.string().optional(),
        reference: z.string().optional(),
      }),
    ),
    get_outstanding_balance: makeTool(
      "get_outstanding_balance",
      "Get total outstanding balance, optionally for one client",
      z.object({ client_id: z.string().optional() }),
    ),
    list_overdue_invoices: makeTool("list_overdue_invoices", "List all overdue invoices", z.object({})),
    generate_reminder: makeTool(
      "generate_reminder",
      "Draft a payment reminder message for an invoice. You must supply the full message text.",
      z.object({
        invoice_id: z.string(),
        tone: z.string().optional(),
        channel: z.string().optional(),
        message: z.string(),
      }),
    ),
    send_reminder: makeTool(
      "send_reminder",
      "Send a previously drafted reminder (requires owner approval, simulated sending)",
      z.object({ reminder_id: z.string() }),
    ),
    get_dashboard_summary: makeTool("get_dashboard_summary", "Financial overview of the business", z.object({})),
    get_client_financial_summary: makeTool(
      "get_client_financial_summary",
      "Financial history and payment behaviour of one client",
      z.object(clientRef),
    ),
    get_company_policies: makeTool("get_company_policies", "Read company policies", z.object({})),
    update_company_policy: makeTool(
      "update_company_policy",
      "Create or change a company policy (requires owner approval)",
      z.object({ policy_key: z.string(), policy_value: z.any() }),
    ),
    save_memory: makeTool(
      "save_memory",
      "Store a durable memory about a client",
      z.object({
        ...clientRef,
        memory_type: z.string(),
        memory_key: z.string(),
        memory_value: z.any(),
      }),
    ),
  };

  let reply = "";
  try {
    const result = await generateText({
      model: getDuelyModel(),
      system: `${SYSTEM}\n\nCURRENT CONTEXT (JSON):\n${JSON.stringify(contextObject)}`,
      messages: (history ?? []).map((h) => ({
        role: h.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: h.message,
      })),
      tools,
      stopWhen: stepCountIs(50),
    });
    reply = result.text?.trim() || "Done.";
  } catch (error) {
    console.error("duely orchestrator error", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("429")) reply = "Duely AI is rate limited right now. Please try again in a moment.";
    else if (message.includes("402")) reply = "AI credits are exhausted. Please top up to keep using Duely AI.";
    else reply = "Something went wrong while processing that. Please try again.";
  }

  await ctx.supabase.from("ai_conversations").insert({
    owner_id: args.userId,
    session_id: args.sessionId,
    role: "assistant",
    message: reply,
    context: { pending: pending.map((p) => p.id) } as never,
  });

  return { reply, pending, performed };
}