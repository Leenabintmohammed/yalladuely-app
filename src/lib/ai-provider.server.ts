import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * Single place where the AI provider/model is chosen.
 * Swapping provider or model = change env vars, no orchestrator changes.
 */
export const DUELY_MODELS = {
  default: "google/gemini-3.6-flash",
  reasoning: "google/gemini-3-pro-preview",
} as const;

export function getDuelyModel(kind: keyof typeof DUELY_MODELS = "default"): LanguageModel {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("missing_ai_api_key");
  const gateway = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const override = process.env["DUELY_AI_MODEL"];
  return gateway(override || DUELY_MODELS[kind]);
}

export function hasAiProvider() {
  return Boolean(process.env["LOVABLE_API_KEY"]);
}
