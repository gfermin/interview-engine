// Core domain schema — plan §16. Scoped to exactly the Phase 2 entity list
// (Position through InterviewDecision). JobAnalysis, AIGenerationRecord,
// SupplementaryAssessment, InterviewReport, and IntegrationReference are
// added in the phases that actually use them (5, 9, 10, 12).
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

// ---------------------------------------------------------------------------
// Position & Job Description (Phase 3)
// ---------------------------------------------------------------------------

export const positions = sqliteTable("positions", {
  id: id(),
  title: text("title").notNull(),
  department: text("department"),
  // Free text, not a DB enum (plan §39.3) — structured enough to drive AI
  // generation and reporting, loose enough that an unusual discipline or
  // seniority ladder isn't blocked by schema. See src/lib/reference-data.ts
  // for the application-layer suggestion lists that seed these fields' UI.
  roleFamily: text("role_family"),
  seniority: text("seniority"),
  status: text("status", { enum: ["open", "filled", "closed"] })
    .notNull()
    .default("open"),
  ...timestamps,
});

export const jobDescriptions = sqliteTable("job_descriptions", {
  id: id(),
  positionId: text("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  rawText: text("raw_text").notNull(),
  status: text("status", { enum: ["draft", "active", "superseded"] })
    .notNull()
    .default("draft"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Job Analysis (Phase 5) — AI-extracted structure from a JobDescription
// version. Plan §16/§39: `detectedRoleFamily`/`detectedSeniority` feed the
// non-blocking mismatch flag against the Position's own stated values — the
// system never overrides the human's selection (§39.3/ADR-006).
// ---------------------------------------------------------------------------

export const jobAnalyses = sqliteTable("job_analyses", {
  id: id(),
  jobDescriptionId: text("job_description_id")
    .notNull()
    .references(() => jobDescriptions.id, { onDelete: "cascade" }),
  detectedRoleFamily: text("detected_role_family"),
  detectedSeniority: text("detected_seniority"),
  // Mirrors the artifact's JD_ANALYSIS shape (mandatory[]/preferred[]/
  // optional[]/notes — plan §2.2) rather than a single flat skills list, so
  // Phase 9's "Mandatory JD Requirements: PASS/FAIL" gate (§4.3) has
  // criticality-tagged requirements to work from, not just free text.
  mandatoryRequirements: text("mandatory_requirements", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  preferredRequirements: text("preferred_requirements", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  optionalRequirements: text("optional_requirements", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  notes: text("notes"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Interview Template (Phase 4) — versioned, lock-on-use (ADR-008)
// ---------------------------------------------------------------------------

/** "technical" and "screening" are the two POC stages (§38). The remaining
 * stages from plan §8 (behavioral, leadership, hiring_manager, final) are
 * designed for but not built in the POC — adding one is a config/content
 * change here, not a schema or engine change. */
export const INTERVIEW_STAGES = ["technical", "screening"] as const;

export const interviewTemplates = sqliteTable("interview_templates", {
  id: id(),
  positionId: text("position_id")
    .notNull()
    .references(() => positions.id, { onDelete: "cascade" }),
  jobDescriptionId: text("job_description_id").references(
    () => jobDescriptions.id
  ),
  stage: text("stage", { enum: INTERVIEW_STAGES }).notNull(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  // draft: editable. approved: published, not yet used. locked: a Session
  // references this exact version — further edits must create a new version.
  status: text("status", { enum: ["draft", "approved", "locked"] })
    .notNull()
    .default("draft"),
  passThreshold: integer("pass_threshold").notNull().default(70),
  borderlineMin: integer("borderline_min").notNull().default(50),
  criticalMin: integer("critical_min").notNull().default(50),
  minCompletion: integer("min_completion").notNull().default(70),
  ...timestamps,
});

export const competencies = sqliteTable("competencies", {
  id: id(),
  templateId: text("template_id")
    .notNull()
    .references(() => interviewTemplates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  weight: integer("weight").notNull(),
  critical: integer("critical", { mode: "boolean" }).notNull().default(false),
  // Seniority-relative description of what "3 - Meets Expected Level" looks
  // like for this competency (plan §39.4) — read by the UI/report, never by
  // ScoringEngine, which stays unaware of seniority entirely (§39.7).
  expectedDepth: text("expected_depth"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/** Boolean knockout gates, NOT scored competencies — plan §4.3/§19. This is
 * the mechanism the original "Calibración QA" master prompt specified
 * ("a mandatory JD requirement is clearly not demonstrated" as an
 * independent AUTOMATIC FAIL condition) but the shipped artifact never
 * implemented, folding everything into competency scoring instead. */
export const mandatoryRequirements = sqliteTable("mandatory_requirements", {
  id: id(),
  templateId: text("template_id")
    .notNull()
    .references(() => interviewTemplates.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const questions = sqliteTable("questions", {
  id: id(),
  templateId: text("template_id")
    .notNull()
    .references(() => interviewTemplates.id, { onDelete: "cascade" }),
  competencyId: text("competency_id")
    .notNull()
    .references(() => competencies.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] })
    .notNull()
    .default("medium"),
  importance: text("importance", { enum: ["core", "secondary", "optional"] })
    .notNull()
    .default("core"),
  expected: text("expected"),
  strong: text("strong"),
  acceptable: text("acceptable"),
  concepts: text("concepts", { mode: "json" }).$type<string[]>().notNull().default([]),
  redFlags: text("red_flags", { mode: "json" }).$type<string[]>().notNull().default([]),
  followUps: text("follow_ups", { mode: "json" }).$type<string[]>().notNull().default([]),
  rubric: text("rubric", { mode: "json" }).$type<string[]>().notNull().default([]),
  code: text("code"),
  solution: text("solution"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// AI Generation Record (Phase 5) — provenance of AI-generated content
// (plan §17): provider/model/prompt version, what was analyzed or
// generated, and (for a template-draft generation) the Question Blueprint
// that constrained it. Written only on a successful, Zod-validated
// generation — a failed call produces nothing to record (plan §28: the
// reviewer sees the raw output and retries, nothing unvalidated persists).
// ---------------------------------------------------------------------------

export const aiGenerationRecords = sqliteTable("ai_generation_records", {
  id: id(),
  // "question_regeneration" added Phase 6 (§39 of the plan's addendum
  // pattern applies here too — additive, no migration needed: this column
  // is a plain TEXT with no DB-level CHECK constraint, so widening the enum
  // is a type-only change).
  kind: text("kind", { enum: ["job_analysis", "template_draft", "question_regeneration"] }).notNull(),
  jobDescriptionId: text("job_description_id").references(() => jobDescriptions.id, {
    onDelete: "set null",
  }),
  templateId: text("template_id").references(() => interviewTemplates.id, {
    onDelete: "set null",
  }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  // The Question Blueprint (coverage/difficulty/type distribution per
  // competency — plan §39.6) that constrained a "template_draft" generation.
  // Null for "job_analysis" records, which have no blueprint step.
  blueprint: text("blueprint", { mode: "json" }),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Candidate & Interview Session (Phases 7-9)
// ---------------------------------------------------------------------------

export const candidates = sqliteTable("candidates", {
  id: id(),
  name: text("name").notNull(),
  email: text("email"),
  notes: text("notes"),
  ...timestamps,
});

export const interviewSessions = sqliteTable("interview_sessions", {
  id: id(),
  candidateId: text("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  // References an exact, immutable Template version (ADR-008) — never the
  // "current" template, so historical evaluations stay meaningful even
  // after the template is edited into a new version.
  templateId: text("template_id")
    .notNull()
    .references(() => interviewTemplates.id),
  status: text("status", { enum: ["in_progress", "completed", "decided"] })
    .notNull()
    .default("in_progress"),
  // Set when the "Reopen" action (Phase 11) is used on a decided session.
  // Deliberately a lightweight marker, not a full AuditEvent log — the
  // audit trail is a confirmed post-POC item (plan §38).
  reopenedAt: integer("reopened_at", { mode: "timestamp" }),
  reopenCount: integer("reopen_count").notNull().default(0),
  ...timestamps,
});

export const questionEvaluations = sqliteTable(
  "question_evaluations",
  {
    id: id(),
    sessionId: text("session_id")
      .notNull()
      .references(() => interviewSessions.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id),
    // 0-5, or null if not yet rated. `isNa` is a separate flag rather than a
    // string sentinel so the column stays a normal, queryable integer — see
    // src/domain/scoring/types.ts QuestionScore for how the two combine.
    score: integer("score"),
    isNa: integer("is_na", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("question_evaluations_session_question_idx").on(
      table.sessionId,
      table.questionId
    ),
  ]
);

export const mandatoryRequirementEvaluations = sqliteTable(
  "mandatory_requirement_evaluations",
  {
    id: id(),
    sessionId: text("session_id")
      .notNull()
      .references(() => interviewSessions.id, { onDelete: "cascade" }),
    requirementId: text("requirement_id")
      .notNull()
      .references(() => mandatoryRequirements.id),
    status: text("status", { enum: ["met", "not_met", "unknown"] })
      .notNull()
      .default("unknown"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("mandatory_requirement_evaluations_session_req_idx").on(
      table.sessionId,
      table.requirementId
    ),
  ]
);

/** Cached rollup of ScoringEngine's per-competency output for a session —
 * recomputed on every rating change (Phase 8), stored so history/reports
 * don't need to re-run the engine against raw evaluations every time. */
export const competencyEvaluations = sqliteTable(
  "competency_evaluations",
  {
    id: id(),
    sessionId: text("session_id")
      .notNull()
      .references(() => interviewSessions.id, { onDelete: "cascade" }),
    competencyId: text("competency_id")
      .notNull()
      .references(() => competencies.id),
    evaluated: integer("evaluated").notNull().default(0),
    na: integer("na").notNull().default(0),
    percent: real("percent"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("competency_evaluations_session_comp_idx").on(
      table.sessionId,
      table.competencyId
    ),
  ]
);

/** Calculated result and human decision, stored separately (plan §21) — the
 * calculated columns are ScoringEngine output and are never hand-edited;
 * `mode`/`finalDecision`/`reason` are the interviewer's decision. In the
 * POC this row is overwritten on "Cambiar decisión" with no history kept,
 * matching the artifact's own behavior — a full audit trail is post-POC. */
export const interviewDecisions = sqliteTable("interview_decisions", {
  id: id(),
  sessionId: text("session_id")
    .notNull()
    .references(() => interviewSessions.id, { onDelete: "cascade" })
    .unique(),
  calculatedStatus: text("calculated_status").notNull(),
  calculatedReason: text("calculated_reason").notNull(),
  calculatedRecommendation: text("calculated_recommendation"),
  mode: text("mode", { enum: ["accept", "override", "forced_call"] }),
  finalDecision: text("final_decision", { enum: ["PASS", "FAIL"] }),
  reason: text("reason"),
  ...timestamps,
});
