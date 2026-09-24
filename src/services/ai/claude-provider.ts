import Anthropic from "@anthropic-ai/sdk";
import { buildJobAnalysisPrompt, buildTemplateDraftPrompt, JOB_ANALYSIS_PROMPT_VERSION, TEMPLATE_DRAFT_PROMPT_VERSION } from "./prompts";
import { jobAnalysisResultSchema, templateDraftSchema, type JobAnalysisResult, type TemplateDraft } from "./schemas";
import { AIValidationError, type AIProvider, type AnalyzeJobDescriptionInput, type GenerateTemplateDraftInput } from "./types";

const JOB_ANALYSIS_TOOL_NAME = "submit_job_analysis";
const TEMPLATE_DRAFT_TOOL_NAME = "submit_template_draft";

const NULLABLE_STRING = { type: ["string", "null"] } as const;

const JOB_ANALYSIS_TOOL: Anthropic.Tool = {
  name: JOB_ANALYSIS_TOOL_NAME,
  description: "Submit the structured analysis of the Job Description.",
  input_schema: {
    type: "object",
    properties: {
      detectedRoleFamily: NULLABLE_STRING,
      detectedSeniority: NULLABLE_STRING,
      mandatoryRequirements: { type: "array", items: { type: "string" } },
      preferredRequirements: { type: "array", items: { type: "string" } },
      optionalRequirements: { type: "array", items: { type: "string" } },
      notes: { type: "string" },
    },
    required: [
      "detectedRoleFamily",
      "detectedSeniority",
      "mandatoryRequirements",
      "preferredRequirements",
      "optionalRequirements",
      "notes",
    ],
  },
};

const DRAFT_QUESTION_SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    importance: { type: "string", enum: ["core", "secondary", "optional"] },
    expected: NULLABLE_STRING,
    strong: NULLABLE_STRING,
    acceptable: NULLABLE_STRING,
    concepts: { type: "array", items: { type: "string" } },
    redFlags: { type: "array", items: { type: "string" } },
    followUps: { type: "array", items: { type: "string" } },
    rubric: {
      type: "array",
      items: { type: "string" },
      description: "One entry per 0-5 score, describing what a response at that score looks like.",
    },
    code: NULLABLE_STRING,
    solution: NULLABLE_STRING,
  },
  required: ["text", "difficulty", "importance", "concepts", "redFlags", "followUps", "rubric"],
};

const TEMPLATE_DRAFT_TOOL: Anthropic.Tool = {
  name: TEMPLATE_DRAFT_TOOL_NAME,
  description: "Submit the generated draft interview template.",
  input_schema: {
    type: "object",
    properties: {
      competencies: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            weight: { type: "integer", minimum: 0, maximum: 100 },
            critical: { type: "boolean" },
            expectedDepth: { type: "string" },
            blueprint: {
              type: "object",
              properties: {
                coverage: { type: "string" },
                questionTypeMix: { type: "string" },
              },
              required: ["coverage", "questionTypeMix"],
            },
            questions: {
              type: "array",
              minItems: 1,
              items: DRAFT_QUESTION_SCHEMA,
            },
          },
          required: ["name", "weight", "critical", "expectedDepth", "blueprint", "questions"],
        },
      },
      mandatoryRequirements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            description: NULLABLE_STRING,
          },
          required: ["label"],
        },
      },
    },
    required: ["competencies", "mandatoryRequirements"],
  },
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
    this.model = options.model ?? DEFAULT_MODEL;
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
