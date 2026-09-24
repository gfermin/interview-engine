// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeProvider } from "./claude-provider";
import { GeminiProvider } from "./gemini-provider";
import { AIProviderNotConfiguredError, getAIProvider } from "./provider";

const ENV_KEYS = ["AI_PROVIDER", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "GEMINI_API_KEY", "GEMINI_MODEL"] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.restoreAllMocks();
});

describe("getAIProvider", () => {
  it("throws when nothing is configured", () => {
    expect(() => getAIProvider()).toThrow(AIProviderNotConfiguredError);
  });

  it("picks Anthropic when only ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(getAIProvider()).toBeInstanceOf(ClaudeProvider);
  });

  it("picks Gemini when only GEMINI_API_KEY is set (plan §38 Phase 5.5: works right away)", () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    expect(getAIProvider()).toBeInstanceOf(GeminiProvider);
  });

  it("prefers Anthropic when both keys are set and AI_PROVIDER is unset", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    expect(getAIProvider()).toBeInstanceOf(ClaudeProvider);
  });

  it("AI_PROVIDER=gemini forces Gemini even when an Anthropic key is also present", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.AI_PROVIDER = "gemini";
    expect(getAIProvider()).toBeInstanceOf(GeminiProvider);
  });

  it("AI_PROVIDER=anthropic without ANTHROPIC_API_KEY throws a specific error", () => {
    process.env.AI_PROVIDER = "anthropic";
    expect(() => getAIProvider()).toThrow(/ANTHROPIC_API_KEY is not set/);
  });

  it("AI_PROVIDER=gemini without GEMINI_API_KEY throws a specific error", () => {
    process.env.AI_PROVIDER = "gemini";
    expect(() => getAIProvider()).toThrow(/GEMINI_API_KEY is not set/);
  });

  it("rejects an unknown AI_PROVIDER value", () => {
    process.env.AI_PROVIDER = "openai";
    expect(() => getAIProvider()).toThrow(/Unknown AI_PROVIDER/);
  });
});
