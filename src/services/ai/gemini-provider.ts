import { FunctionCallingConfigMode, GoogleGenAI, type FunctionDeclaration } from "@google/genai";
import {
  DRAFT_QUESTION_JSON_SCHEMA,
  JOB_ANALYSIS_FUNCTION_NAME,
  JOB_ANALYSIS_JSON_SCHEMA,
  REGENERATE_QUESTION_FUNCTION_NAME,
  TEMPLATE_DRAFT_FUNCTION_NAME,
  TEMPLATE_DRAFT_JSON_SCHEMA,
} from "./json-schemas";
import {
  buildJobAnalysisPrompt,
  buildRegenerateQuestionPrompt,
  buildTemplateDraftPrompt,
  JOB_ANALYSIS_PROMPT_VERSION,
  REGENERATE_QUESTION_PROMPT_VERSION,
  TEMPLATE_DRAFT_PROMPT_VERSION,
} from "./prompts";
import {
  draftQuestionSchema,
  jobAnalysisResultSchema,
  templateDraftSchema,
  type JobAnalysisResult,
  type TemplateDraft,
  type TemplateDraftQuestion,
} from "./schemas";
import {
  AIValidationError,
  summarizeValidationIssues,
  type AIProvider,
  type AnalyzeJobDescriptionInput,
  type GenerateTemplateDraftInput,
  type RegenerateQuestionInput,
} from "./types";

const JOB_ANALYSIS_DECLARATION: FunctionDeclaration = {
  name: JOB_ANALYSIS_FUNCTION_NAME,
  description: "Submit the structured analysis of the Job Description.",
  parametersJsonSchema: JOB_ANALYSIS_JSON_SCHEMA,
};

const TEMPLATE_DRAFT_DECLARATION: FunctionDeclaration = {
  name: TEMPLATE_DRAFT_FUNCTION_NAME,
  description: "Submit the generated draft interview template.",
  parametersJsonSchema: TEMPLATE_DRAFT_JSON_SCHEMA,
};

const REGENERATE_QUESTION_DECLARATION: FunctionDeclaration = {
  name: REGENERATE_QUESTION_FUNCTION_NAME,
  description: "Submit the regenerated replacement question.",
  parametersJsonSchema: DRAFT_QUESTION_JSON_SCHEMA,
};

export interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
}

// "gemini-flash-latest" and pinned Flash versions returned persistent 503
// ("high demand") during live testing of this provider; flash-lite is
// lower-cost and apparently gets more free-tier headroom — verified
// working end-to-end (JD analysis + full template draft generation)
// against a real free-tier key. Override with GEMINI_MODEL if this changes.
const DEFAULT_MODEL = "gemini-flash-lite-latest";

/**
 * A second {@link AIProvider} implementation (plan §38 Phase 5.5) — proves
 * ADR-005's abstraction actually holds by adding a real provider that isn't
 * Claude, and gives free-tier testing of the generation pipeline (Gemini's
 * free tier supports function calling) without spending Anthropic credits.
 * Not a production recommendation — ADR-005's reasoning (structured-output
 * reliability) still favors Claude as the default; this exists for local
 * development and cost-free iteration.
 *
 * Uses forced function-calling (`FunctionCallingConfigMode.ANY` +
 * `allowedFunctionNames`) — Gemini's equivalent of Anthropic's forced
 * tool-use — so the response is already structured before Zod validates it.
 */
export class GeminiProvider implements AIProvider {
  readonly providerName = "google";
  readonly model: string;
  private readonly client: GoogleGenAI;

  constructor(options: GeminiProviderOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    // `||`, not `??` — see the identical note in ClaudeProvider.
    this.model = options.model || DEFAULT_MODEL;
  }

  async analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<JobAnalysisResult> {
    const { system, user } = buildJobAnalysisPrompt(input);
    const args = await this.callForFunction(system, user, JOB_ANALYSIS_DECLARATION);
    const parsed = jobAnalysisResultSchema.safeParse(args);
    if (!parsed.success) {
      throw new AIValidationError(
        `AI job analysis output failed validation: ${summarizeValidationIssues(parsed.error)}`,
        args
      );
    }
    return parsed.data;
  }

  async generateTemplateDraft(input: GenerateTemplateDraftInput): Promise<TemplateDraft> {
    const { system, user } = buildTemplateDraftPrompt(input);
    const args = await this.callForFunction(system, user, TEMPLATE_DRAFT_DECLARATION);
    const parsed = templateDraftSchema.safeParse(args);
    if (!parsed.success) {
      throw new AIValidationError(
        `AI template draft output failed validation: ${summarizeValidationIssues(parsed.error)}`,
        args
      );
    }
    return parsed.data;
  }

  async regenerateQuestion(input: RegenerateQuestionInput): Promise<TemplateDraftQuestion> {
    const { system, user } = buildRegenerateQuestionPrompt(input);
    const args = await this.callForFunction(system, user, REGENERATE_QUESTION_DECLARATION);
    const parsed = draftQuestionSchema.safeParse(args);
    if (!parsed.success) {
      throw new AIValidationError(
        `AI question regeneration output failed validation: ${summarizeValidationIssues(parsed.error)}`,
        args
      );
    }
    return parsed.data;
  }

  private async callForFunction(
    system: string,
    user: string,
    declaration: FunctionDeclaration
  ): Promise<unknown> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: user,
      config: {
        systemInstruction: system,
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: [declaration.name!],
          },
        },
        tools: [{ functionDeclarations: [declaration] }],
      },
    });

    const call = response.functionCalls?.find((c) => c.name === declaration.name);
    if (!call) {
      throw new Error("The AI returned an unexpected response — try again.");
    }
    return call.args;
  }
}

export { JOB_ANALYSIS_PROMPT_VERSION, REGENERATE_QUESTION_PROMPT_VERSION, TEMPLATE_DRAFT_PROMPT_VERSION };
