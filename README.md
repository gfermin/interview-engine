# 🎙️ Interview Platform

## 📌 Overview

This project is a local, JD-driven interview assessment platform — the universal, production-style successor to the "Calibración QA" reference artifact.

It generates structured interview templates from a Job Description with the help of an LLM, runs the live candidate interview against them, and computes the final PASS/FAIL/BORDERLINE result with a deterministic scoring engine that never delegates the hiring decision to the AI.

Full analysis, architecture decisions, data model, and the phased implementation plan (25 phases and counting) live in
[`docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md`](../Prompts/docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md)
in the sibling `Prompts` project — this README stays a snapshot of the current architecture, not a changelog.

This repository focuses not only on shipping features, but on demonstrating disciplined, phased product/engineering delivery: every phase has a written objective, dependencies, acceptance criteria, and a verified-in-browser completion note before the next one starts.

---

## 🎯 Goals of This Project

- Build a domain-driven interview assessment engine with a deterministic, AI-independent scoring core
- Keep AI generation strictly assistive — a human always reviews and can edit everything before it's used, and the AI never computes PASS/FAIL (ADR-006)
- Support multiple interview stages (Technical Interview, First Screening) with genuinely different generation targets, not one prompt with a stage flag
- Make every assessment method (coding exercises included) an explicit, opt-in decision — never implied by role type or interview stage
- Provide safe template versioning (draft → approved → locked) so a candidate's historical evaluation stays meaningful even after the template evolves
- Give every entity (Position, Template, Candidate, Session, Report) a domain-enforced lifecycle policy — no naive delete button that can silently destroy a finalized hiring decision
- Ship a fully bilingual (English/Spanish) UI and interview content, on two independent axes (app language vs. interview content language)
- Use TypeScript (`strict: true`) and Zod validation at every human/AI input boundary to catch mistakes at compile time or at the schema gate, not in production

---

## 🏗 Project Structure

```
src/
  app/                  # Next.js routes (positions, templates, candidates, interviews) + api/reports/[id] download route
  components/
    layout/              # App shell (sidebar, topbar)
    ui/                   # shadcn/ui primitives
  db/                   # Drizzle schema + client
  domain/
    scoring/              # ScoringEngine/CompletenessEngine/CriticalRequirementEngine (pure)
    interviews/            # Stage config, template versioning, session lifecycle, session-scoring composition, section-status, decision state machine, narrative (all pure)
    reports/               # Report display-name/filename builder (pure)
  features/
    positions/            # Position + Job Description CRUD
    templates/             # Template/Competency/MandatoryRequirement/Question CRUD + versioning + AI actions
    candidates/            # Candidate CRUD + start-Interview-Session flow
    interviews/            # Live rating + Summary/Decision screens: rate/notes/mandatory-requirement/English/decision mutations + actions, question card, rate bar, section nav, decision form
    reports/               # generateReport mutation, listAllReports/per-session report queries, "Generate Report" action + button
  services/
    ai/                    # AIProvider interface, provider.ts selector, ClaudeProvider + GeminiProvider, prompts, Zod output schemas
    pdf/                   # HTML report template (pure) + Playwright render-to-PDF
  lib/                  # Shared utilities, i18n.ts (translation lookup)
  locales/              # en/ + es/ namespaced JSON translation resources
e2e/                  # Playwright specs
```

See §32 of the implementation plan for the full target structure as later phases add to it.

---

## 🧠 Architecture & Design Decisions

### 1️⃣ A Deterministic Scoring Core, Decoupled From AI

The AI never decides PASS/FAIL (ADR-006). `domain/scoring/` (`ScoringEngine`, `CompletenessEngine`, `CriticalRequirementEngine`) is pure, synchronous, AI-agnostic code — it takes rated `QuestionEvaluation`s and a `Competency` model and returns a calculated status. AI only ever produces *content* (competencies, questions, rubrics) for a human to review; it is architecturally incapable of touching the result.

```ts
export interface Competency {
  id: string;
  weight: number;      // integers per template summing to exactly 100
  critical: boolean;   // a knockout: failing this competency fails the candidate
}
```

**Why this matters:** the hiring decision is always explainable, reproducible, and independent of whichever AI provider or prompt version generated the questions.

---

### 2️⃣ A Pluggable `AIProvider` Abstraction

Every AI-assisted touch point (JD analysis, template draft generation, single-question regeneration) sits behind one interface, so a second provider is a new implementation, not a rewrite of any caller.

```ts
export interface AIProvider {
  readonly providerName: string;
  readonly model: string;
  analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<JobAnalysisResult>;
  generateTemplateDraft(input: GenerateTemplateDraftInput): Promise<TemplateDraft>;
  regenerateQuestion(input: RegenerateQuestionInput): Promise<TemplateDraftQuestion>;
}
```

`ClaudeProvider` (`@anthropic-ai/sdk`, the recommended default — ADR-005: structured-output reliability) and `GeminiProvider` (`@google/genai`, a free-tier alternative for local testing) both implement it behind forced tool-use, and every generation is Zod-validated before it ever touches the database.

---

### 3️⃣ Template Versioning — Lock on Use (ADR-008)

A Template is `draft` (fully editable) → `approved` (published, not yet used) → `locked` (an Interview Session now references this exact version). A Session always points at an immutable, specific version, so editing a template into a new version never rewrites the meaning of a candidate's already-recorded evaluation.

---

### 4️⃣ Per-Stage Configuration as a Ceiling, Not a Branch

Stage-specific behavior (First Screening vs. Technical Interview) is centralized as configuration, not scattered `if (stage === ...)` branches — and a stage's module flag is a *ceiling* on what's possible, never the actual default:

```ts
export const STAGE_MODULES: Record<InterviewStage, StageModuleConfig> = {
  technical: { codeExercises: true, supplementaryAssessments: true },
  screening: { codeExercises: false, supplementaryAssessments: true },
};
```

Coding exercises, for example, are opt-in per template (`template.includeCodeExercises`, default off) *within* whatever a stage allows — Technical's `true` only means the module is available; First Screening's `false` is an absolute rule no per-template value can override.

---

### 5️⃣ Cookie-Based i18n, No Client Router

The app is 100% Server Components + Server Actions with no client-side router, so `next-intl`/`react-i18next`'s `[locale]`-URL or Context-provider assumptions don't fit. Instead, the language switch mirrors the existing theme-toggle pattern exactly: a cookie + `resolveLocale()` + a minimal `t(locale, "namespace.key")` lookup against namespaced JSON dictionaries in `src/locales/{en,es}/`, with an English fallback and a dictionary-completeness test keeping both locales in sync. Interview *content* language (`interviewLanguage`) is a fully independent axis from the app's own UI language.

---

### 6️⃣ Domain-Enforced Entity Lifecycle

Position, Template, Candidate, Session, and Report each get a lifecycle policy derived from their real dependencies, not a blanket delete button: hard-delete is only ever allowed when an entity is genuinely dependency-free (verified server-side against the actual referencing rows, not a proxy `status` field), and falls back to Archive/Restore otherwise. A `decided` Session (a real recorded hiring decision) can never be hard-deleted — only archived. A dedicated referential-integrity regression suite asserts that deleting one entity never destroys an unrelated, protected one.

---

## 🧩 Example: Resolving Whether to Generate a Coding Exercise

A small, representative slice of the architecture above — the stage ceiling and the template's own opt-in are ANDed together right where the AI request is built, so a screening template can never produce a coding exercise no matter what:

```ts
const includeCodeExercises =
  getStageConfig(stage).modules.codeExercises && template.includeCodeExercises;

const rawDraft = await provider.generateTemplateDraft({
  positionTitle: position.title,
  seniority: position.seniority,
  stage,
  jobAnalysis,
  includeCodeExercises,
  interviewLanguage: template.interviewLanguage,
});
```

The end-to-end flow this participates in: **Position + Job Description → Analyze (AI) → Generate Draft (AI, Zod-validated) → human review/edit → Approve → Start Interview Session (locks the template version) → live rating → Decision → PDF Report.**

---

## 🚀 Project Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd interview-platform
```

### 2. Install dependencies

```bash
npm install
npx playwright install chromium
```

`npx playwright install chromium` downloads the browser binary Playwright needs — required for PDF report generation and `npm run test:e2e`. Skip it and everything else in the app still works, but "Generate Report" fails with a clear error until it's installed.

### 3. Configure the environment

```bash
cp .env.example .env
```

Set `ANTHROPIC_API_KEY` **or** `GEMINI_API_KEY` to actually call an AI provider for JD analysis / template generation. Without either, those actions surface a clear "not configured" error and everything else — templates, live rating, scoring, PDF reports — keeps working fully offline.

---

## ▶️ Running the App & Tests

```bash
npm run dev             # start the local dev server → http://localhost:3000
npm run build            # production build
npm run lint              # ESLint
npm test                   # unit/component tests (Vitest)
npm run test:watch          # Vitest in watch mode
npm run test:coverage        # Vitest with coverage (@vitest/coverage-v8)
npm run test:e2e              # end-to-end tests (Playwright; auto-starts the dev server on port 3100)
npm run db:generate            # generate a Drizzle migration from src/db/schema.ts
npm run db:migrate               # apply pending migrations to the local SQLite file
npm run db:studio                 # open Drizzle Studio against the local database
```

The local SQLite file lives at `.data/dev.sqlite` (gitignored, created automatically). See ADR-002 in the implementation plan for why SQLite was chosen over IndexedDB/Postgres for the POC.

---

## 📈 Scalability & Future Enhancements

Already in place:

- A `Competency`/`Question` domain model with no per-question-type special-casing — adding a new assessment method (a coding exercise today) never requires touching the scoring or completeness engines
- Pluggable `AIProvider` abstraction (Claude + Gemini today; a third provider is a new implementation, not a rewrite)
- Draft/approved/locked template versioning so historical evaluations survive template edits
- Domain-enforced entity lifecycle (archive/delete) protecting finalized hiring decisions from naive deletion
- Full bilingual (EN/ES) UI and interview content on two independent axes, with a dictionary-completeness test guarding drift
- 430+ unit/integration tests, including dedicated regression suites for the properties that matter most (referential integrity, decision-lock correctness, stage-ceiling enforcement)

Planned / open (see the implementation plan's Phase 12 and Phase 24):

- BambooHR integration (Phase 12 — deliberately deferred until the core loop was proven)
- Production readiness: authentication/RBAC, Postgres migration, encrypted storage, a real deployment target, observability (Phase 24)
- A generalized `PracticalExercise` (`type: CODING | SYSTEM_DESIGN | SQL | ...`) abstraction if a second exercise kind is ever needed — deliberately not built ahead of that actual requirement
- Additional interview stages (behavioral, leadership, hiring manager, final) — designed for in the stage-config module, not yet built

---

## 🛠 Tech Stack

- Next.js (App Router, TypeScript, `strict: true`)
- Tailwind CSS + shadcn/ui
- SQLite via Drizzle ORM
- Zod + React Hook Form
- Vitest + Testing Library (unit/component tests)
- Playwright (E2E tests, and PDF report generation)
- Claude (`@anthropic-ai/sdk`, recommended default) or Gemini (`@google/genai`, free tier) behind the `AIProvider` abstraction
- `@fontsource/ibm-plex-sans` / `@fontsource/ibm-plex-mono` — self-hosted typography, zero external font-network dependency

Design tokens (colors, IBM Plex Sans/Mono typography) in `src/app/globals.css` are ported directly from the "Calibración QA" artifact for visual continuity, including its pass/borderline/fail/provisional/N-A status-color semantics.

---

## 💡 What This Project Demonstrates

- Domain-driven design with a scoring core that stays pure and AI-agnostic by construction, not by convention
- Careful AI-integration boundaries — structured-output validation, provenance records, and an architecture where the model literally cannot decide a hiring outcome
- Rigorous entity-lifecycle and referential-integrity thinking, verified with dedicated regression suites, not just optimistic happy-path tests
- Configuration-as-ceiling design (stage rules vs. per-template opt-in) instead of scattered conditional branching
- Deep i18n handling that correctly separates UI language from domain content language
- Disciplined, phased delivery — every phase shipped with a written objective, explicit acceptance criteria, and live in-browser verification before being marked complete

This is not just a feature-by-feature build log —
it is a structured platform built with long-term maintainability, correctness, and safety in mind.

---

## 👨‍💻 Author

**George Luis Fermin Martinez**

Specializing in:

- Full-stack TypeScript/Next.js application architecture
- Domain-driven design and deterministic business logic
- AI-assisted product features with disciplined human-in-the-loop boundaries
- Scalable, testable platform engineering
