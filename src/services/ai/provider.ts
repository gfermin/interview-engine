import { ClaudeProvider } from "./claude-provider";
import type { AIProvider } from "./types";

export class AIProviderNotConfiguredError extends Error {
  constructor() {
    super(
      "ANTHROPIC_API_KEY is not set. Add it to .env to enable AI-assisted JD analysis and question generation (plan §17/Phase 5)."
    );
    this.name = "AIProviderNotConfiguredError";
  }
}

/**
 * The only place that decides which {@link AIProvider} implementation is
 * live (ADR-005) — callers depend on the interface, never on `ClaudeProvider`
 * directly, so adding a second provider later is additive here.
 */
export function getAIProvider(): AIProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AIProviderNotConfiguredError();
  return new ClaudeProvider({ apiKey, model: process.env.ANTHROPIC_MODEL });
}
