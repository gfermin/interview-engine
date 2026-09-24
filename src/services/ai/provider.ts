import { ClaudeProvider } from "./claude-provider";
import { GeminiProvider } from "./gemini-provider";
import type { AIProvider } from "./types";

export class AIProviderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderNotConfiguredError";
  }
}

/**
 * The only place that decides which {@link AIProvider} implementation is
 * live (ADR-005) — callers depend on the interface, never on `ClaudeProvider`
 * or `GeminiProvider` directly.
 *
 * Selection (plan §38 Phase 5.5): `AI_PROVIDER` ("anthropic" | "gemini")
 * forces a choice — useful for deliberately testing on Gemini's free tier
 * even when an Anthropic key is also present. Without it, whichever key is
 * actually set wins, Anthropic first (matching ADR-005's default
 * recommendation) — so setting just `GEMINI_API_KEY` works with no other
 * configuration, which is the point of Phase 5.5 (free-tier testing that
 * works right away).
 */
export function getAIProvider(): AIProvider {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (forced === "gemini") return buildGeminiProvider();
  if (forced === "anthropic") return buildClaudeProvider();
  if (forced) {
    throw new AIProviderNotConfiguredError(
      `Unknown AI_PROVIDER "${process.env.AI_PROVIDER}" — expected "anthropic" or "gemini".`
    );
  }

  if (process.env.ANTHROPIC_API_KEY) return buildClaudeProvider();
  if (process.env.GEMINI_API_KEY) return buildGeminiProvider();

  throw new AIProviderNotConfiguredError(
    "No AI provider is configured. Add ANTHROPIC_API_KEY (recommended, see ADR-005) or GEMINI_API_KEY (free tier, see plan §38 Phase 5.5) to .env to enable AI-assisted JD analysis and question generation (plan §17/Phase 5)."
  );
}

function buildClaudeProvider(): AIProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AIProviderNotConfiguredError(
      "AI_PROVIDER is set to \"anthropic\" but ANTHROPIC_API_KEY is not set."
    );
  }
  return new ClaudeProvider({ apiKey, model: process.env.ANTHROPIC_MODEL });
}

function buildGeminiProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIProviderNotConfiguredError(
      "AI_PROVIDER is set to \"gemini\" but GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey."
    );
  }
  return new GeminiProvider({ apiKey, model: process.env.GEMINI_MODEL });
}
