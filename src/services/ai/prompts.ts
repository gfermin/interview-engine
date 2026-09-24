// Prompt-engineering assets — versioned, editable text, not database rows
// (plan §39.4: "a static, versioned prompt-engineering asset... changes by
// editing a prompt template, not by a migration"). Bump the `*_PROMPT_VERSION`
// constants whenever the wording changes meaningfully enough that an
// AIGenerationRecord's provenance should distinguish old drafts from new.
import type { AnalyzeJobDescriptionInput, GenerateTemplateDraftInput, RegenerateQuestionInput } from "./types";

export const JOB_ANALYSIS_PROMPT_VERSION = "job-analysis-v1";
export const TEMPLATE_DRAFT_PROMPT_VERSION = "template-draft-v1";
export const REGENERATE_QUESTION_PROMPT_VERSION = "regenerate-question-v1";

/**
 * Reference table (plan §39.4/§5): what a seniority level's expected
 * behaviors look like, in general — used to prime `expectedDepth` and
 * question-depth generation. Seniority is free text (§39.3), so this is a
 * best-effort lookup (case-insensitive substring match) with a generic
 * fallback for a level outside this list, never a hard requirement.
 */
const SENIORITY_EXPECTATIONS: Record<string, string> = {
  entry:
    "Learning fundamentals; follows guidance and established patterns; limited independent judgment expected yet.",
  junior:
    "Applies known patterns correctly with some guidance; can implement well-scoped tasks independently.",
  "mid-level":
    "Independent implementation and troubleshooting; explains trade-offs at the feature/component level.",
  mid: "Independent implementation and troubleshooting; explains trade-offs at the feature/component level.",
  senior:
    "Explains WHY, not just HOW; architecture-level trade-offs, risk analysis, and mentoring signal expected.",
  lead: "Sets technical direction for a team; balances technical and delivery trade-offs; mentors others explicitly.",
  staff:
    "Cross-team technical influence; identifies and resolves systemic issues; judgment on ambiguous, high-stakes decisions.",
  principal:
    "Organization-wide technical influence; sets standards other senior engineers are expected to follow.",
  manager:
    "Evaluated on team outcomes and people leadership as much as individual technical depth.",
  director:
    "Evaluated on cross-team/org strategy and leadership; technical depth matters less than judgment and influence.",
};

function describeSeniority(seniority: string | null): string {
  if (!seniority) return "No specific seniority was provided — calibrate for a generalist, mid-level bar.";
  const key = Object.keys(SENIORITY_EXPECTATIONS).find((k) =>
    seniority.toLowerCase().includes(k)
  );
  const description = key
    ? SENIORITY_EXPECTATIONS[key]
    : "Calibrate depth to what this specific level implies, using the title as your best signal.";
  return `Requested seniority: "${seniority}". ${description}`;
}

const SHARED_SYSTEM_PREAMBLE = `You are assisting a human interviewer in building a structured, fair, and reusable interview evaluation template. You never make hiring decisions and you never compute pass/fail — a separate deterministic scoring engine does that from the content you produce. A human always reviews and can edit everything you generate before it is used.`;

export function buildJobAnalysisPrompt(input: AnalyzeJobDescriptionInput): {
  system: string;
  user: string;
} {
  const system = `${SHARED_SYSTEM_PREAMBLE}

Your task: analyze a Job Description and extract its structure. Identify:
- The role family and seniority level the JD itself reads as (this may differ from what the interviewer selected — that's fine and expected, report what you see).
- Requirements, split into mandatory (must-have, explicitly required), preferred (nice-to-have, explicitly called out as a plus), and optional (mentioned but clearly not a bar to entry).
- Brief notes on anything distinctive about this JD versus a generic posting for this role (e.g. an unusual tech requirement, a domain specialization).

Be concise and factual. Do not invent requirements the JD doesn't support.`;

  const user = `Position: ${input.positionTitle}
Interviewer-selected Role Family: ${input.roleFamily ?? "(not specified)"}
Interviewer-selected Seniority: ${input.seniority ?? "(not specified)"}
Interview Stage: ${input.stage}

Job Description:
"""
${input.jobDescriptionText}
"""`;

  return { system, user };
}

export function buildTemplateDraftPrompt(input: GenerateTemplateDraftInput): {
  system: string;
  user: string;
} {
  const stageGuidance =
    input.stage === "screening"
      ? "This is a First Screening interview — a shorter, earlier-stage conversation. Favor fewer, broader competencies and lean more heavily on mandatory requirements (work authorization, required certifications, minimum experience, logistics) than on deep technical competency scoring. Do not generate hands-on coding exercises."
      : "This is a full Technical Interview. Generate deeper, more numerous competencies and questions, including hands-on coding/debugging exercises where the competency calls for them.";

  const codeGuidance = input.includeCodeExercises
    ? "For competencies where a hands-on coding or debugging exercise is the best way to assess depth, include one via the question's `code`/`solution` fields."
    : "Do not include `code` or `solution` fields on any question — this stage does not include hands-on coding exercises.";

  const system = `${SHARED_SYSTEM_PREAMBLE}

Your task: given a Position, its Role Family and Seniority, an Interview Stage, a Job Description, and its analysis, generate a complete draft interview template:

1. A Competency Model: 3-8 competencies, each with a name, a weight (integers summing to exactly 100), whether it's critical (a knockout: failing this specific competency fails the candidate regardless of overall score — mark critical only for genuinely make-or-break competencies, not everything important), and an Expected Depth description — what "3, Meets Expected Level" looks like for THIS competency at THIS seniority. ${describeSeniority(input.seniority)}
2. Mandatory Requirements: boolean knockout gates that are NOT scored competencies (e.g. work authorization, a required certification, a minimum years-of-experience bar) — derived from the Job Analysis's mandatory requirements where they're the kind of thing that's demonstrated/not demonstrated rather than scored on a 0-5 scale. It is fine for this list to be empty if nothing in the JD fits this pattern.
3. For each competency, a brief internal Question Blueprint (coverage topics, question-type mix) followed by 2-4 questions matching that blueprint. Each question needs: the question text, difficulty, importance, expected/strong/acceptable answer guidance, key concepts, red flags, follow-ups, and a rubric with one line per 0-5 score anchored to what a response at that score actually looks like.

${stageGuidance}

${codeGuidance}

Critical: the SAME topic at a different seniority should probe different depth (architecture/trade-offs/scale for Senior+, fundamentals/correct-pattern-application for Junior/Mid) — not the same question with harder adjectives. Ground everything in the actual Job Description text; do not generate generic filler unrelated to it.`;

  const user = `Position: ${input.positionTitle}
Role Family: ${input.roleFamily ?? "(not specified)"}
Seniority: ${input.seniority ?? "(not specified)"}
Interview Stage: ${input.stage}

Job Description:
"""
${input.jobDescriptionText}
"""

Job Analysis:
- Mandatory requirements: ${input.jobAnalysis.mandatoryRequirements.join("; ") || "(none extracted)"}
- Preferred requirements: ${input.jobAnalysis.preferredRequirements.join("; ") || "(none extracted)"}
- Optional requirements: ${input.jobAnalysis.optionalRequirements.join("; ") || "(none extracted)"}
- Notes: ${input.jobAnalysis.notes || "(none)"}`;

  return { system, user };
}

/**
 * Phase 6: regenerate exactly one question for one competency, without
 * touching the rest of the template. The existing question is shown so the
 * model produces a genuinely different question on the same competency —
 * not a reworded duplicate — matching the plan's stated intent for
 * "regenerate."
 */
export function buildRegenerateQuestionPrompt(input: RegenerateQuestionInput): {
  system: string;
  user: string;
} {
  const codeGuidance = input.includeCodeExercises
    ? "If a hands-on coding or debugging exercise is the best way to assess this competency, include one via the `code`/`solution` fields."
    : "Do not include `code` or `solution` fields — this stage does not include hands-on coding exercises.";

  const system = `${SHARED_SYSTEM_PREAMBLE}

Your task: generate ONE replacement question for a single competency in an existing interview template. The interviewer was not satisfied with the current question for this competency and wants a different one — same competency, same general depth/seniority target, but a genuinely different question, not a reworded version of the one being replaced.

The question needs: the question text, difficulty, importance, expected/strong/acceptable answer guidance, key concepts, red flags, follow-ups, and a rubric with one line per 0-5 score anchored to what a response at that score actually looks like. ${describeSeniority(input.seniority)}

${codeGuidance}

Ground the question in the Job Description when one is provided; otherwise ground it in the competency name and its Expected Depth description alone.`;

  const user = `Position: ${input.positionTitle}
Role Family: ${input.roleFamily ?? "(not specified)"}
Seniority: ${input.seniority ?? "(not specified)"}
Interview Stage: ${input.stage}
Competency: ${input.competencyName}
Expected Depth for this competency: ${input.competencyExpectedDepth ?? "(not specified)"}

${
  input.jobDescriptionText
    ? `Job Description:\n"""\n${input.jobDescriptionText}\n"""\n\n`
    : ""
}Question being replaced (produce something different, not a rewording of this):
- Text: ${input.existingQuestion.text}
- Difficulty: ${input.existingQuestion.difficulty}
- Importance: ${input.existingQuestion.importance}`;

  return { system, user };
}
