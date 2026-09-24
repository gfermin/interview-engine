import Anthropic from "@anthropic-ai/sdk";
import {
  JOB_ANALYSIS_FUNCTION_NAME,
  JOB_ANALYSIS_JSON_SCHEMA,
  TEMPLATE_DRAFT_FUNCTION_NAME,
  TEMPLATE_DRAFT_JSON_SCHEMA,
} from "./json-schemas";
import { buildJobAnalysisPrompt, buildTemplateDraftPrompt, JOB_ANALYSIS_PROMPT_VERSION, TEMPLATE_DRAFT_PROMPT_VERSION } from "./prompts";
import { jobAnalysisResultSchema, templateDraftSchema, type JobAnalysisResult, type TemplateDraft } from "./schemas";
import { AIValidationError, type AIProvider, type AnalyzeJobDescriptionInput, type GenerateTemplateDraftInput } from "./types";

const JOB_ANALYSIS_TOOL: Anthropic.Tool = {
  name: JOB_ANALYSIS_FUNCTION_NAME,
  description: "Submit the structured analysis of the Job Description.",
  input_schema: JOB_ANALYSIS_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
};

const TEMPLATE_DRAFT_TOOL: Anthropic.Tool = {
  name: TEMPLATE_DRAFT_FUNCTION_NAME,
  description: "Submit the generated draft interview template.",
  input_schema: TEMPLATE_DRAFT_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
};

export interface ClaudeProviderOptions {
  apiKey: string;
  model?: string;
}

const DEFAULT_MODEL = "claude-sonnet-5";

/**
 * The only implemented AIProvider (plan ADR-005) — a second provider
 * (OpenAI, a local model) is a new class implementing the same interface,
 * not a rewrite of anything that calls `getAIProvider()`.
 *
 * Uses forced tool-use (rather than asking for JSON in free text) so the
 * model's response is already structured — Zod validation on top of that is
 * defense-in-depth, not the primary structuring mechanism.
 */
export class ClaudeProvider implements AIProvider {
  readonly providerName = "anthropic";
  readonly model: string;
  private readonly client: Anthropic;

  constructor(options: ClaudeProviderOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    // `||`, not `??` — an unset env var declared but left blank in .env
    // (e.g. `ANTHROPIC_MODEL=`) comes through as `""`, which `??` would not
    // catch, silently sending an empty model string to the API.
    this.model = options.model || DEFAULT_MODEL;
  }

  async analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<JobAnalysisResult> {
    const { system, user } = buildJobAnalysisPrompt(input);
    const toolInput = await this.callForTool(system, user, JOB_ANALYSIS_TOOL);
    const parsed = jobAnalysisResultSchema.safeParse(toolInput);
    if (!parsed.success) {
      throw new AIValidationError(
        `AI job analysis output failed validation: ${parsed.error.message}`,
        toolInput
      );
    }
    return parsed.data;
  }

  async generateTemplateDraft(input: GenerateTemplateDraftInput): Promise<TemplateDraft> {
    const { system, user } = buildTemplateDraftPrompt(input);
    const toolInput = await this.callForTool(system, user, TEMPLATE_DRAFT_TOOL);
    const parsed = templateDraftSchema.safeParse(toolInput);
    if (!parsed.success) {
      throw new AIValidationError(
        `AI template draft output failed validation: ${parsed.error.message}`,
        toolInput
      );
    }
    return parsed.data;
  }

  private async callForTool(
    system: string,
    user: string,
    tool: Anthropic.Tool
  ): Promise<unknown> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: user }],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error(`AI response did not include a "${tool.name}" tool call.`);
    }
    return toolUse.input;
  }
}

export { JOB_ANALYSIS_PROMPT_VERSION, TEMPLATE_DRAFT_PROMPT_VERSION };
