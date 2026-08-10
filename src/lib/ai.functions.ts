import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ChatInput = z.object({
  message: z.string().min(1),
  session_id: z.string(),
  page: z.string().optional(),
  focus: z
    .object({ type: z.string(), id: z.string(), summary: z.string().optional() })
    .nullable()
    .optional(),
});

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

export const duelyChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }): Promise<ChatResult> => {
    const { runOrchestrator } = await import("./duely-orchestrator.server");
    const focus = data.focus
      ? { type: data.focus.type, id: data.focus.id, summary: data.focus.summary ?? "" }
      : null;
    return runOrchestrator({
      supabase: context.supabase,
      userId: context.userId,
      message: data.message,
      sessionId: data.session_id,
      page: data.page ?? "dashboard",
      focus,
    });
  });

export const resolveAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ action_id: z.string(), decision: z.enum(["approve", "reject"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { executeTool } = await import("./duely-tools.server");
    const { data: action } = await context.supabase
      .from("ai_actions")
      .select("*")
      .eq("id", data.action_id)
      .maybeSingle();
    if (!action) return { status: "error" as const, message: "action_not_found" };
    if (action.status !== "awaiting_approval") return { status: "error" as const, message: "already_resolved" };

    if (data.decision === "reject") {
      await context.supabase.from("ai_actions").update({ status: "rejected" }).eq("id", action.id);
      return { status: "rejected" as const, message: "" };
    }

    const result = await executeTool(action.tool_name, (action.parameters ?? {}) as Record<string, unknown>, {
      supabase: context.supabase,
      userId: context.userId,
    });
    await context.supabase
      .from("ai_actions")
      .update({ status: "completed", result: result as never })
      .eq("id", action.id);
    return { status: "completed" as const, message: JSON.stringify(result) };
  });