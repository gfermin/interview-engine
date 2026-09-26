// Prompt-engineering assets — versioned, editable text, not database rows
// (plan §39.4: "a static, versioned prompt-engineering asset... changes by
// editing a prompt template, not by a migration"). Bump the `*_PROMPT_VERSION`
// constants whenever the wording changes meaningfully enough that an
// AIGenerationRecord's provenance should distinguish old drafts from new.
import type { InterviewLanguage } from "@/domain/interviews/interview-language";
import type { AnalyzeJobDescriptionInput, GenerateTemplateDraftInput, RegenerateQuestionInput } from "./types";

export const JOB_ANALYSIS_PROMPT_VERSION = "job-analysis-v1";
export const TEMPLATE_DRAFT_PROMPT_VERSION = "template-draft-v1";
export const REGENERATE_QUESTION_PROMPT_VERSION = "regenerate-question-v1";
// First Screening HR-focused generation (plan Phase 22/§43.14) — a distinct
// version so AIGenerationRecord.promptVersion correctly distinguishes
// screening-stage drafts from technical-stage drafts going forward;
// existing records keep their original "template-draft-v1" value unchanged.
export const SCREENING_TEMPLATE_DRAFT_PROMPT_VERSION = "screening-template-draft-v1";

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

const LANGUAGE_NAMES: Record<InterviewLanguage, string> = { en: "English", es: "Spanish" };

/**
 * Plan Phase 21/§24: the AI generation request must explicitly state the
 * interview content language rather than let the model guess it from the
 * Job Description text — a JD can be written in one language for an
 * interview explicitly configured to run in another. Field NAMES are part
 * of the fixed JSON schema and stay in English regardless; only the
 * generated VALUES follow this language.
 */
function languageInstruction(language: InterviewLanguage): string {
  return `Write every generated VALUE — question text, expected/strong/acceptable answers, key concepts, red flags, follow-ups, rubric lines, notes, and any other candidate- or interviewer-facing prose — entirely in ${LANGUAGE_NAMES[language]}, regardless of what language the Job Description below happens to be written in. The JSON field NAMES themselves are fixed and stay in English.`;
}

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

Be concise and factual. Do not invent requirements the JD doesn't support.

${languageInstruction(input.interviewLanguage)}`;

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

/**
 * Dispatches to the stage-appropriate builder (plan Phase 22/§43.5) — the
 * single call site both AI providers use stays unchanged; First Screening
 * gets a wholly distinct set of generation instructions
 * ({@link buildScreeningTemplateDraftPrompt}), not a stage flag threaded
 * into one shared prompt (§43.1's finding: a single differentiating
 * sentence was not enough to keep deep technical questions out of an
 * HR-conducted interview).
 */
export function buildTemplateDraftPrompt(input: GenerateTemplateDraftInput): {
  system: string;
  user: string;
} {
  if (input.stage === "screening") return buildScreeningTemplateDraftPrompt(input);

  const codeGuidance = input.includeCodeExercises
    ? "For competencies where a hands-on coding or debugging exercise is the best way to assess depth, include one via the question's `code`/`solution` fields."
    : "Do not include `code` or `solution` fields on any question — this stage does not include hands-on coding exercises.";

  const system = `${SHARED_SYSTEM_PREAMBLE}

Your task: given a Position, its Role Family and Seniority, an Interview Stage, a Job Description, and its analysis, generate a complete draft interview template:

1. A Competency Model: 3-8 competencies, each with a name, a weight (integers summing to exactly 100), whether it's critical (a knockout: failing this specific competency fails the candidate regardless of overall score — mark critical only for genuinely make-or-break competencies, not everything important), and an Expected Depth description — what "3, Meets Expected Level" looks like for THIS competency at THIS seniority. ${describeSeniority(input.seniority)}
2. Mandatory Requirements: boolean knockout gates that are NOT scored competencies (e.g. work authorization, a required certification, a minimum years-of-experience bar) — derived from the Job Analysis's mandatory requirements where they're the kind of thing that's demonstrated/not demonstrated rather than scored on a 0-5 scale. It is fine for this list to be empty if nothing in the JD fits this pattern.
3. For each competency, a brief internal Question Blueprint (coverage topics, question-type mix) followed by 2-4 questions matching that blueprint. Each question needs: the question text, difficulty, importance, expected/strong/acceptable answer guidance, key concepts, red flags, follow-ups, a rubric with one line per 0-5 score anchored to what a response at that score actually looks like, and — when the question clearly exercises a specific requirement from the Job Analysis below — a 'jdRequirementTag' naming that requirement (null if none applies cleanly). For code questions, also give 'altSolutions' describing other valid approaches besides the primary solution.

This is a full Technical Interview. Generate deeper, more numerous competencies and questions, including hands-on coding/debugging exercises where the competency calls for them.

${codeGuidance}

Critical: the SAME topic at a different seniority should probe different depth (architecture/trade-offs/scale for Senior+, fundamentals/correct-pattern-application for Junior/Mid) — not the same question with harder adjectives. Ground everything in the actual Job Description text; do not generate generic filler unrelated to it.

${languageInstruction(input.interviewLanguage)}`;

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
 * First Screening's own generation instructions (plan Phase 22/§43.14) —
 * NOT the technical builder with a stage flag. The audience is an HR/
 * recruiting professional who may have little or no technical background;
 * the objective is qualification/alignment evidence, not technical
 * certification. Curated core questions (introduction, motivation,
 * availability, candidate questions — §43.13) are NOT requested here; they
 * are merged in programmatically by the caller
 * (features/templates/ai-actions.ts, from src/lib/screening-core-questions.ts)
 * so this prompt only needs to produce role-specific competencies/questions
 * derived from the JD.
 */
function buildScreeningTemplateDraftPrompt(input: GenerateTemplateDraftInput): {
  system: string;
  user: string;
} {
  const system = `${SHARED_SYSTEM_PREAMBLE}

You are generating a FIRST SCREENING interview intended primarily for an HR/recruiting professional who may have little or no technical expertise in this role's domain (software engineering, QA, DevOps, cloud, data, AI/LLMs, or any other specialized discipline the Job Description describes).

Your objective is NOT to technically certify the candidate. Your objective is to determine whether there is sufficient evidence of relevant experience, role alignment, required qualifications, communication ability, motivation, and seniority indicators to justify progression to a later, deeper technical stage. A human interviewer with no domain expertise must be able to ask every question you generate and judge the response using only the guidance you provide — never their own technical judgment.

DO NOT generate: coding questions, hands-on debugging exercises, system design questions, deep architecture questions, framework-internals trivia, or any question whose evaluation requires specialist technical knowledge the interviewer is not assumed to have. If a Job Analysis requirement seems to demand this kind of question, leave it out of this draft entirely — it belongs in a later Technical Interview stage, not here.

For every Job Analysis requirement that IS appropriate for this stage (a claimed skill, technology, or experience area that can be validated at a high level — "have you used it professionally, for how long, in what context, at what level of responsibility" — without judging technical correctness), generate 1-2 questions following this HIGH-LEVEL EXPERIENCE VALIDATION pattern: has the candidate used it professionally, approximately how long, is it part of their current/recent role, and can they briefly describe a project and their own responsibility on it. Write the question's 'expected'/'strong'/'acceptable' fields as EVIDENCE TIERS the interviewer can recognize without technical judgment — for example: 'expected' describes what "No Evidence" or bare exposure sounds like, 'acceptable' describes "Relevant Experience," and 'strong' describes "Strong Relevant Experience" — not what a technically correct answer contains. The rubric's six lines (one per 0-5 score) must use this same evidence-based framing (e.g. "0 — No Evidence/Does Not Meet" ... "3 — Meets Screening Expectation" ... "5 — Excellent Evidence"), never a technical-correctness framing. Set 'jdRequirementTag' to the specific requirement each question validates.

If a question's text unavoidably references a technical term the interviewer may not know (e.g. Kubernetes, CI/CD, a specific framework), set 'technicalTermHelper' to a short, plain-language explanation of the term plus an explicit reminder that the interviewer should focus on professional usage/duration/responsibility, not technical correctness. Leave 'technicalTermHelper' null when no such term appears. Set 'requiresTechnicalKnowledge' to true only in the rare case where no HR-safe phrasing of a necessary question exists — this should be uncommon, and is itself a signal the requirement is better suited to a later Technical Interview.

Generate 2-5 role-specific competencies (fewer than a full Technical Interview — favor breadth over depth), each with a name drawn from what a recruiter screen actually assesses (e.g. "Relevant Experience", "Required Qualifications", "Seniority Indicators", "Role Alignment" — not engineering competency names like "Architecture" or "APIs"), a weight, whether it's critical (rare at this stage — reserve for a genuinely make-or-break requirement), and an Expected Depth description written for a non-technical reader. ${describeSeniority(input.seniority)} These competencies are IN ADDITION to a standard "Background, Motivation & Communication" competency the platform adds automatically — do not duplicate introduction, motivation, availability, or candidate-questions content; focus entirely on role-specific, JD-derived validation.

Mandatory Requirements: boolean knockout gates (work authorization, a required certification, a required language level, a minimum years-of-experience bar, a required location/work-arrangement) — derived only from Job Analysis requirements that are genuinely hard, verifiable gates, not general preferences. It is fine for this list to be empty. Do not include a compensation or work-authorization gate here — those are added separately by the platform only when explicitly enabled.

Do not include 'code' or 'solution' fields on any question — this stage never includes hands-on coding exercises.

Ground every question in the actual Job Description text; do not generate generic filler unrelated to it, and do not generate the same question with harder wording than a Technical Interview would use for the same topic — if a topic needs that kind of depth, it belongs in Technical Interview, not here.

${languageInstruction(input.interviewLanguage)}`;

  const user = `Position: ${input.positionTitle}
Role Family: ${input.roleFamily ?? "(not specified)"}
Seniority: ${input.seniority ?? "(not specified)"}
Interview Stage: screening (First Screening — HR/recruiter-conducted)

Job Description:
"""
${input.jobDescriptionText}
"""

Job Analysis:
- Mandatory requirements: ${input.jobAnalysis.mandatoryRequirements.join("; ") || "(none extracted)"}
- Preferred requirements: ${input.jobAnalysis.preferredRequirements.join("; ") || "(none extracted)"}
- Optional requirements: ${input.jobAnalysis.optionalRequirements.join("; ") || "(none extracted)"}
- Notes: ${input.jobAnalysis.notes || "(none)"}

For each requirement above, first decide silently whether it is HR-validatable (a claimed skill/experience you can turn into a high-level evidence question), technical-later (too deep for a non-technical interviewer to evaluate — omit it from this draft), logistical (work arrangement, location — consider a Mandatory Requirement), or language-related (consider noting it, the platform handles language assessment separately) — then generate only from the HR-validatable and genuinely-logistical ones.`;

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

The question needs: the question text, difficulty, importance, expected/strong/acceptable answer guidance, key concepts, red flags, follow-ups, a rubric with one line per 0-5 score anchored to what a response at that score actually looks like, and — when it clearly exercises a specific JD requirement — a 'jdRequirementTag' naming it (null if none applies). For a code question, also give 'altSolutions'. ${describeSeniority(input.seniority)}

${codeGuidance}

Ground the question in the Job Description when one is provided; otherwise ground it in the competency name and its Expected Depth description alone.

${languageInstruction(input.interviewLanguage)}`;

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
