// Curated core First Screening questions (plan Phase 22/§43.13) — the
// hybrid "curated core + JD-derived + AI adaptation" approach: standard
// recruiter-screen questions (introduction, motivation, availability,
// candidate questions) don't benefit from being freshly generated on every
// template, so they're static, human-reviewed content merged into a
// screening draft programmatically rather than left to AI variability.
// Compensation/work-authorization content is added separately, gated by the
// template's own opt-in toggles (§43.11) — never included unconditionally.
import type { TemplateDraft, TemplateDraftQuestion } from "@/services/ai/schemas";

type CoreQuestion = Omit<TemplateDraftQuestion, "code" | "solution" | "jdRequirementTag" | "altSolutions"> & {
  code: null;
  solution: null;
  jdRequirementTag: null;
  altSolutions: null;
};

const CORE_QUESTIONS: CoreQuestion[] = [
  {
    text: "Tell me briefly about yourself and your current role.",
    difficulty: "easy",
    importance: "core",
    expected: "No Evidence: cannot summarize their own background coherently.",
    strong: "Strong Relevant Experience: clear, well-organized summary connecting past experience to this opportunity.",
    acceptable: "Relevant Experience: gives a workable summary of background and current role, possibly needing a follow-up.",
    concepts: ["Clarity of background summary", "Professional communication"],
    redFlags: ["Cannot describe their own current responsibilities"],
    followUps: ["What are your main responsibilities in your current or most recent position?"],
    rubric: [
      "0 — No Evidence/Does Not Meet: cannot describe their background or role.",
      "1 — Very Weak Evidence: rambling, unclear, or contradicts the resume.",
      "2 — Limited Evidence: gets through it but needs heavy prompting.",
      "3 — Meets Screening Expectation: clear, organized summary of background and current role.",
      "4 — Strong Evidence: clear summary that also connects naturally to this opportunity.",
      "5 — Excellent Evidence: concise, well-organized, and immediately clarifies fit for the role.",
    ],
    code: null,
    solution: null,
    jdRequirementTag: null,
    altSolutions: null,
    requiresTechnicalKnowledge: false,
    technicalTermHelper: null,
  },
  {
    text: "Tell me about the level of ownership you currently have in your team.",
    difficulty: "easy",
    importance: "secondary",
    expected: "No Evidence: cannot describe any responsibility beyond following instructions.",
    strong: "Strong Relevant Experience: describes concrete ownership (leading a piece of work, mentoring, making decisions) matching or exceeding the requested seniority.",
    acceptable: "Relevant Experience: describes a reasonable level of ownership for the requested seniority.",
    concepts: ["Seniority indicator", "Scope of responsibility", "Ownership vs. task execution"],
    redFlags: ["Described ownership is inconsistent with the seniority level being hired for"],
    followUps: ["Do you currently mentor other team members or participate in team decisions? Tell me briefly about that."],
    rubric: [
      "0 — No Evidence/Does Not Meet: no description of responsibility or ownership.",
      "1 — Very Weak Evidence: purely task-execution, no ownership signal.",
      "2 — Limited Evidence: some ownership but well below the requested seniority.",
      "3 — Meets Screening Expectation: ownership level is consistent with the requested seniority.",
      "4 — Strong Evidence: ownership level is clearly consistent, with a concrete example.",
      "5 — Excellent Evidence: ownership level exceeds what's typically expected at this seniority.",
    ],
    code: null,
    solution: null,
    jdRequirementTag: null,
    altSolutions: null,
    requiresTechnicalKnowledge: false,
    technicalTermHelper: null,
  },
  {
    text: "Why are you considering a change from your current position?",
    difficulty: "easy",
    importance: "core",
    expected: "No Evidence: cannot articulate a reason, or gives an answer that raises a professionalism concern.",
    strong: "Strong Relevant Experience: articulates a clear, professional, forward-looking reason.",
    acceptable: "Relevant Experience: gives a reasonable, professional reason for exploring new opportunities.",
    concepts: ["Career motivation", "Professionalism"],
    redFlags: ["Speaks negatively/unprofessionally about a current or former employer without constructive framing"],
    followUps: ["What are you looking for in your next role?"],
    rubric: [
      "0 — No Evidence/Does Not Meet: no coherent or professional reason given.",
      "1 — Very Weak Evidence: reason is vague or raises a concern.",
      "2 — Limited Evidence: reason is workable but thin.",
      "3 — Meets Screening Expectation: clear, professional, reasonable motivation.",
      "4 — Strong Evidence: clear motivation that also aligns well with this role.",
      "5 — Excellent Evidence: articulate, professional, and directly connects to what this role offers.",
    ],
    code: null,
    solution: null,
    jdRequirementTag: null,
    altSolutions: null,
    requiresTechnicalKnowledge: false,
    technicalTermHelper: null,
  },
  {
    text: "What interested you about this opportunity, and what do you understand about the role so far?",
    difficulty: "easy",
    importance: "core",
    expected: "No Evidence: shows no awareness of what the role involves.",
    strong: "Strong Relevant Experience: shows genuine interest and an accurate, if high-level, understanding of the role.",
    acceptable: "Relevant Experience: shows some genuine interest and a reasonable understanding of the role.",
    concepts: ["Role/company interest", "Basic role understanding"],
    redFlags: ["No apparent understanding of the role and no attempt to engage with it"],
    followUps: ["What are the most important things you're looking for in your next opportunity?"],
    rubric: [
      "0 — No Evidence/Does Not Meet: no interest or understanding of the role shown.",
      "1 — Very Weak Evidence: generic interest with no role-specific understanding.",
      "2 — Limited Evidence: some interest, thin understanding of the role.",
      "3 — Meets Screening Expectation: genuine interest and a reasonable understanding of the role.",
      "4 — Strong Evidence: genuine interest with a clear, accurate understanding of the role.",
      "5 — Excellent Evidence: strong, specific interest tied to concrete aspects of the role/company.",
    ],
    code: null,
    solution: null,
    jdRequirementTag: null,
    altSolutions: null,
    requiresTechnicalKnowledge: false,
    technicalTermHelper: null,
  },
  {
    text: "What is your current notice period, and when would you potentially be available to start?",
    difficulty: "easy",
    importance: "core",
    expected: "No Evidence: cannot state an availability timeline.",
    strong: "Strong Relevant Experience: gives a clear, specific timeline compatible with the role's needs.",
    acceptable: "Relevant Experience: gives a workable, if approximate, timeline.",
    concepts: ["Availability", "Notice period", "Logistics"],
    redFlags: ["Availability is clearly incompatible with the role's stated timeline"],
    followUps: [],
    rubric: [
      "0 — No Evidence/Does Not Meet: no timeline given.",
      "1 — Very Weak Evidence: timeline is unclear or contradictory.",
      "2 — Limited Evidence: rough timeline given, needs follow-up.",
      "3 — Meets Screening Expectation: clear, workable timeline.",
      "4 — Strong Evidence: clear timeline, compatible with role needs.",
      "5 — Excellent Evidence: clear, specific, and immediately compatible timeline.",
    ],
    code: null,
    solution: null,
    jdRequirementTag: null,
    altSolutions: null,
    requiresTechnicalKnowledge: false,
    technicalTermHelper: null,
  },
  {
    text: "What are the most important things you're looking for in your next opportunity, and what kind of team or environment helps you perform your best?",
    difficulty: "easy",
    importance: "secondary",
    expected: "No Evidence: cannot articulate any preference.",
    strong: "Strong Relevant Experience: articulates specific, self-aware preferences that align well with this role/team.",
    acceptable: "Relevant Experience: articulates reasonable preferences, loosely compatible with this role.",
    concepts: ["Candidate expectations", "Working-style compatibility"],
    redFlags: ["Stated expectations are clearly incompatible with a documented requirement of the role"],
    followUps: [],
    rubric: [
      "0 — No Evidence/Does Not Meet: no preferences articulated.",
      "1 — Very Weak Evidence: vague, generic preferences only.",
      "2 — Limited Evidence: some preferences given, unclear fit.",
      "3 — Meets Screening Expectation: reasonable, compatible preferences.",
      "4 — Strong Evidence: specific preferences that align well with this role.",
      "5 — Excellent Evidence: specific, self-aware preferences with a clear match to this role/team.",
    ],
    code: null,
    solution: null,
    jdRequirementTag: null,
    altSolutions: null,
    requiresTechnicalKnowledge: false,
    technicalTermHelper: null,
  },
  {
    text: "What questions do you have about the position, the company, or the interview process?",
    difficulty: "easy",
    importance: "optional",
    expected: "No Evidence: has no questions and shows no engagement.",
    strong: "Strong Relevant Experience: asks specific, thoughtful questions about the role, team, or process.",
    acceptable: "Relevant Experience: asks at least one reasonable question.",
    concepts: ["Candidate engagement"],
    redFlags: [],
    followUps: [],
    rubric: [
      "0 — No Evidence/Does Not Meet: no questions, no engagement.",
      "1 — Very Weak Evidence: declines to ask anything when prompted twice.",
      "2 — Limited Evidence: asks a very generic question.",
      "3 — Meets Screening Expectation: asks at least one reasonable, relevant question.",
      "4 — Strong Evidence: asks a specific, well-considered question.",
      "5 — Excellent Evidence: asks multiple thoughtful questions showing real engagement with the role.",
    ],
    code: null,
    solution: null,
    jdRequirementTag: null,
    altSolutions: null,
    requiresTechnicalKnowledge: false,
    technicalTermHelper: null,
  },
];

const COMPENSATION_QUESTION: CoreQuestion = {
  text: "What compensation range are you targeting for your next opportunity?",
  difficulty: "easy",
  importance: "core",
  expected: "No Evidence: declines to give any range or figure.",
  strong: "Strong Relevant Experience: gives a clear, specific range compatible with the role's budget.",
  acceptable: "Relevant Experience: gives a workable range, even if it needs later confirmation.",
  concepts: ["Compensation alignment", "Logistics"],
  redFlags: ["Stated range is clearly and significantly outside the role's budget"],
  followUps: [],
  rubric: [
    "0 — No Evidence/Does Not Meet: no range given.",
    "1 — Very Weak Evidence: range is vague or evasive.",
    "2 — Limited Evidence: rough range given, needs confirmation.",
    "3 — Meets Screening Expectation: clear range given.",
    "4 — Strong Evidence: clear range, compatible with the role's budget.",
    "5 — Excellent Evidence: clear, specific range that's immediately compatible.",
  ],
  code: null,
  solution: null,
  jdRequirementTag: null,
  altSolutions: null,
  requiresTechnicalKnowledge: false,
  technicalTermHelper: null,
};

/**
 * Assembles the curated "Background, Motivation & Communication" competency
 * for a First Screening draft (plan §43.13). Not AI-generated — merged
 * programmatically by the screening generation flow (features/templates/
 * ai-actions.ts) alongside whatever role-specific competencies the AI
 * produced from the JD. `includeCompensationQuestion` mirrors the template's
 * own opt-in toggle (§43.11) — compensation is never asked by default.
 */
export function buildCoreScreeningCompetency(options: {
  includeCompensationQuestion: boolean;
}): TemplateDraft["competencies"][number] {
  const questions = options.includeCompensationQuestion
    ? [...CORE_QUESTIONS, COMPENSATION_QUESTION]
    : CORE_QUESTIONS;

  return {
    name: "Background, Motivation & Communication",
    weight: 25,
    critical: false,
    expectedDepth:
      "Candidate can clearly narrate their background and current responsibilities, articulates a professional reason for exploring this opportunity, and communicates at a level appropriate for the requested seniority. No technical correctness is assessed here.",
    blueprint: {
      coverage: "Standard recruiter-screen opening, motivation, seniority indicators, logistics, and closing — not derived from a specific JD requirement.",
      questionTypeMix: "Curated core questions, asked consistently across candidates for this stage.",
    },
    questions,
  };
}

/** Work authorization is a hard knockout gate, not a scored competency
 * (plan §43.10/§43.11) — added as a MandatoryRequirement, never a Question,
 * and only when the template's own opt-in toggle is enabled. */
export function buildWorkAuthorizationRequirement(): TemplateDraft["mandatoryRequirements"][number] {
  return {
    label: "Work Authorization",
    description:
      "Confirm the candidate is authorized to work in the location required for this role. Enabled by template configuration as a required knockout check — mark Not Met if the candidate cannot confirm authorization.",
  };
}
