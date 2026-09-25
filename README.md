# Interview Platform

A local, JD-driven interview assessment platform — the universal successor to
the "Calibración QA" reference artifact. Full analysis, architecture
decisions, data model, and phased implementation plan live in
[`docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md`](../Prompts/docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md)
in the sibling `Prompts` project.

**Status:** Phase 11 (Persistence / History / Versioning Hardening) complete
— **this is the POC completion** (plan §11: "this phase's completion is the
POC completion").
Phases 0-11 done: app shell + SQLite/Drizzle (1), ScoringEngine/
CompletenessEngine/CriticalRequirementEngine + full schema (2), Position +
Job Description management with Role Family/Seniority (3), the Template
builder — Competency/MandatoryRequirement/Question CRUD, reordering,
draft/approved/locked versioning (ADR-008), and the per-stage (Technical/
Screening) config map (4), an `AIProvider` abstraction + `ClaudeProvider`
behind forced tool-use, wired into the builder as "Analyze Job Description"
(→ `JobAnalysis`, with a non-blocking role/seniority mismatch flag) and
"Generate Draft" (→ a full Competency/MandatoryRequirement/Question set,
Zod-validated before touching the database, with an `AIGenerationRecord`
kept for provenance) (5), a second `AIProvider` implementation,
`GeminiProvider`, for free-tier local testing without spending Anthropic
credits (5.5, plan §38 addendum), per-question AI "Regenerate" — re-calls
AI for one question only, replacing it in place (same id/order) so the
rest of the template and sibling questions are untouched (6), a Candidate
roster (create/edit, notes) with a "Start Interview Session" flow that
picks any published (approved or locked) Template and creates an
`InterviewSession` against its exact version — the first real exercise of
Phase 4's lock-on-use guard: an `approved` Template flips to `locked` the
moment a Session references it, and a `draft` Template is refused outright
(7), and the live interview rating screen itself (`/interviews/[sessionId]`)
— the artifact's question cards (collapsible expected-answer/rubric/
follow-up panels, 0-5/N/A rate bar, autosaving notes) rebuilt as
database-backed React, with a per-competency section nav (○/●/✓/⚠ status
icons) and live overall/completion/critical chips recomputed by the same
`ScoringEngine`/`CompletenessEngine`/`CriticalRequirementEngine` from
Phase 2 on every rating change, and a `competencyEvaluations` rollup cache
persisted alongside for later phases to read without recomputing (8), and
a Summary/Decision screen (`/interviews/[sessionId]/summary`) reached from
the live rating screen's "View Summary" action: the unmodified Phase 2
`ScoringEngine.calculate()` now runs for real, wired up to a
`MandatoryRequirement` gate with its own tri-state (Met/Not Met/Unknown)
control per requirement — the boolean knockout the original master prompt
specified but the "Calibración QA" artifact never built — an optional
English `SupplementaryAssessment` (1-5 level, gated by a per-template
`englishRequired`/`englishMinLevel` config on the Scoring Configuration
form), a per-competency breakdown grid, a template-string narrative
paragraph, and the artifact's three-path decision workflow (accept,
override, or — only when the calculated status is the BORDERLINE
"ambiguous middle" — an explicit forced PASS/FAIL call), each requiring a
reason except a plain accept. Recording a decision moves the session
`in_progress` → `decided` (with `completed` as an intermediate "finished
rating, not yet decided" state) and freezes its ratings read-only; changing
a decision overwrites the prior one with no history kept — a confirmed POC
limitation (plan §21/§38) (9), and PDF reporting (ADR-007): a "Generate
Report" action on the Summary screen (gated on the session being `decided`)
renders a server-side HTML template — candidate/position/stage/version,
calculated status and decision, competency breakdown, the Mandatory
Requirement and English gates, deterministic strengths/concerns, and the
narrative — through headless Chromium (`playwright`) into a real PDF,
written to `.data/reports/` and referenced by an immutable
`InterviewReport` row; a download route
(`/api/reports/[id]`) streams the bytes back, and regenerating adds a new
report rather than overwriting the last one (10).
and an Interview History screen (`/interviews`) listing and filtering every
session by position/candidate/stage/status, plus an explicit "Reopen"
action — the only way back to an editable session once `finishRating` or
`recordDecision` has locked it. Reopening sends the session back to
`in_progress` and stamps `reopenedAt`/`reopenCount`; it doesn't delete the
prior decision or report, which stay visible until the interviewer
re-decides, and generating a report again after a reopen produces a
*second*, distinct `InterviewReport` rather than overwriting the first
(11). Hardening this phase also caught and fixed a real Phase 9 bug: the
Summary screen's own Mandatory Requirement and English controls were
guarded by the *ratings* lock (`in_progress`-only) instead of the *decision*
lock (`decided`-only), so they broke the moment "View Summary" moved a
session to `completed` — before a decision even existed. They're now
guarded correctly, and read-only once a session is `decided`.
Requires `ANTHROPIC_API_KEY` **or** `GEMINI_API_KEY` in `.env` to actually
call an AI provider — without either, AI actions surface a clear error and
everything else keeps working offline. Requires Playwright's Chromium
browser to be installed locally (see Getting started) — without it, report
generation fails with a clear error and everything else keeps working.
**This completes the core POC loop (Phases 1-11).**

**Phase 13 (Hardening / Testing / UX Polish)** — entered directly from
Phase 11 (Phase 12/BambooHR deliberately skipped for now, per its own
"only pursued after the core loop is proven" framing). Because this
phase's plan entry is open-ended rather than a fixed requirements list, it
started with a full-codebase audit (test coverage, error-messaging
quality, missing Next.js conventions, UX rough edges, dead code, Zod
schema gaps) instead of a predetermined task list — see plan §40 for the
complete findings. The audit's pure-display/copy/comment findings were
applied immediately: a duplicated position-title fix in the "Start
Interview Session" template picker, friendly labels in place of raw
enums (`REVIEW_REQUIRED`, `PASS`/`FAIL` now using each stage's own
vocabulary via `statusLabelFor`) on the Summary screen's Recommendation
and Decision displays, one shared session-status label map replacing
three separate ad hoc versions, a clearer interview-history empty state,
a working link on the Template builder's "add a competency first"
message, and several stale phase-tense comments corrected. Findings that
needed an actual logic change — a confirmed `DecisionForm` state bug after
Reopen, several jargon-y/leaky error messages, missing `error.tsx`/
`not-found.tsx`, a handful of data-integrity gaps, and the bulk of the
test-coverage gaps (`createNewTemplateVersion` most notably) — were
recorded in plan §40 as a reviewed backlog, then resolved in a deliberate
follow-up pass (plan §40.7): the `DecisionForm` bug is fixed (guarded at
both the component's initial-state derivation and via a `key={status}` at
its call site, with a regression test proving both halves are needed);
every jargon-y/leaky error message now reads in plain language, including
mapped AI-provider status codes (401/429/5xx/network) and a friendly
"install Chromium" message when Playwright's binary is missing; a styled
root `error.tsx` and `not-found.tsx` now catch the class of uncaught
exceptions/404s the audit flagged; the data-integrity gaps (double-click
guard on "Create New Version," cross-template ownership checks on
questions/mandatory-requirements, and length caps aligned between the
human-authored form schemas and the AI-generated-content schemas) are
closed; and the test-coverage backlog is closed except a deliberately
skipped e2e journey test (real coverage of the core loop continues to live
in Vitest integration tests, per the audit's own note that this was
already an established, working deviation from the plan text) — 265
unit/component tests now pass (up from 207), including new coverage for
`createNewTemplateVersion`, the delete/update/move mutations, `listSessions`
filters, `DecisionForm`, and the Server Actions this pass's fixes touched.
A coverage tool (`@vitest/coverage-v8`, `npm run test:coverage`) is
configured for the first time.

Phases 14-16 (Calibración QA visual/interaction parity — persistent
scoreboard/performance bar, restored question-card styling, colored
competency dashboard; Dashboard operational rebuild; JD-tag/alt-solutions
question fields) are complete — see the implementation plan's §41.

**Phase 18 (Reports Hub & Report Naming)** is complete. A root-cause audit
(plan §42) found `/reports` had no route at all — the sidebar's link hit
the framework 404 — even though reports themselves were persisting
correctly. `/reports` now lists every finalized report across every
candidate (`listAllReports`, joined against the same `InterviewDecision`
Summary already reads, never recalculated independently), searchable by
candidate/position and filterable by stage, sorted newest-first, with a
true empty state distinct from a "no filter matches" state. Reports are
now candidate-identifiable everywhere: a centralized
`domain/reports/naming.ts` builds both a human-readable `displayName`
(`Candidate — Position — Stage`) and a filesystem-safe `fileName` (with a
report-id suffix so same-day/duplicate-name candidates stay distinguishable),
persisted on `InterviewReport` at generation time; the download route's
`Content-Disposition` and the Summary screen's report list both use it,
falling back to a live-computed value for the handful of reports generated
before these columns existed (no backfill migration needed).

**Phase 19 (Layout Width System)** is complete. The audit (plan §42) traced
the app's narrow feel to ~23 pages each independently hardcoding their own
`<main className="mx-auto max-w-[Npx]">` wrapper (640-980px) — not a shell
or sidebar bug, since `AppSidebar` + the `flex-1` main region already
claimed full remaining viewport width correctly. A shared
`components/layout/page-container.tsx` now owns width for every page via a
`standard` (720px, simple forms) / `wide` (1200px, lists/detail/dashboard/
template builder) / `full` (1440px, Live Interview + Summary) variant,
replacing every one of those literals. Verified at 1920px, 1280px, and
tablet (768px) widths — no horizontal overflow at any size, and the
existing `InterviewScoreboard`'s `flex-wrap` chip row degrades cleanly on
its own without needing a new breakpoint.

**Phase 20 (Internationalization Foundation)** is complete. Rather than
next-intl/react-i18next (which assume `[locale]` URL routing or a client
Context provider — a mismatch for an app that's 100% Server Components +
Server Actions with no client router), the app language switch mirrors
`features/settings/theme.ts`'s own cookie-based pattern exactly:
`features/settings/locale.ts` (`APP_LOCALE_COOKIE`, `resolveLocale`) +
`setLocaleAction`, defaulting to English (the app's actual current
language, confirmed by audit before this phase started). A minimal
`lib/i18n.ts` looks up `"namespace.key"` strings against namespaced JSON
resources under `src/locales/{en,es}/` (`common`, `navigation`, `dashboard`,
`settings`, `reports`, `interview` — the last two added in Phase 21), with
an English fallback for any missing Spanish key and
a dictionary-completeness test guarding both locales stay in sync. The
Settings page now has a Language section alongside Appearance; the sidebar
nav, `AppTopbar`'s "POC" badge, and the full Dashboard are localized as the
proof-of-mechanism surfaces. Verified in-browser: switching languages
updates the whole shell immediately (no page reload, same `revalidatePath`
pattern as the theme toggle), the choice survives a fresh navigation
(cookie persistence), and `<html lang>` tracks the active locale. Domain/
business values (interview status, stage, template status) and
query-generated prose (Attention Required item text) are deliberately left
English for now — per plan §32/§33 those need their own stage-aware label
maps, not ad-hoc UI-dictionary keys, and are Phase 21's job alongside the
bulk hardcoded-string migration across the remaining pages.

**Phase 21 (Interview Language & Content Localization) is complete.**
Tasks 21.1-21.3 and 21.5 shipped as described below, and Task 21.4's bulk
hardcoded-string migration now covers the whole app: Live Interview and
Summary (the plan's own §18 "most information-dense screens" priority) plus
every component they use (`QuestionCard`, `DecisionForm`,
`MandatoryRequirementControl`, `CompetencyDashboard`, `InterviewScoreboard`,
`ReopenSessionButton`, `GenerateReportButton`), and the full Templates
builder (`template-form`, `competency-form`, `mandatory-requirement-form`,
`question-form`, `scoring-config-form`, `ai-components`, `template-actions`,
and all nine `app/templates/**` pages), Candidates (`candidate-form`,
`start-session-form`, all four `app/candidates/**` pages), and Positions
(`position-form`, `job-description-editor`, all four `app/positions/**`
pages) — three new namespaces (`templates`, `candidates`, `positions`,
187 combined keys) alongside the five from Phase 20. Verified end-to-end in
the browser against real data across every major surface: switching the app
to Spanish translates every UI label, heading, button, and form field
throughout — including the role/seniority-mismatch warning on the template
detail page — while question text, JD text, AI-analysis notes, and domain
values (`PASS`, stage/status/difficulty/importance labels, template status)
correctly stay in their original language. A `decided` session's Live
Interview and Summary screens confirm the App-language/Interview-language
independence works exactly as designed, not just unit-tested: the narrative
paragraph and question content follow that session's own English-language
template regardless of the app being set to Spanish. What shipped:
`interviewTemplates.interviewLanguage` (`en`/`es`, required at creation,
carried forward unchanged by `createNewTemplateVersion` — the same
fixed-at-creation treatment `stage` already gets, since neither has an
in-place edit mutation) is now visible on the template creation form, the
template detail page, and the "Start Interview Session" template picker.
`services/ai/prompts.ts`'s three generation prompts (job analysis, template
draft, question regeneration) each now carry an explicit language
instruction sourced from the template's `interviewLanguage` — confirmed via
`prompts.test.ts` — rather than leaving the model to guess from the JD
text. The PDF report template and its narrative paragraph (`buildNarrative`)
now render in the session's template `interviewLanguage`, independent of
whoever clicks "Generate Report" or what their own app language is set to
(plan §28's simplest-predictable-rule); the ScoringEngine's own `reason`
string is deliberately left untranslated — domain output, not narrative
copy. The `/reports` page picked up a full `reports` namespace and is now
bilingual end-to-end, including locale-aware date formatting
(`toLocaleDateString(locale)`) — verified in-browser in both languages
against real data. Business/domain values (status, stage, template status)
remain intentionally untouched per §32/§33.

**Phase 22 (First Screening Generation Redesign, plan §43) is complete.**
A research pass (recruiter/HR screening best practices, cross-checked
against independent sources) confirmed the hypothesis behind this phase:
First Screening and Technical Interview shared one AI generation prompt
(`buildTemplateDraftPrompt`) with a single stage-differentiating sentence —
nothing stopped, and nothing actively discouraged, deep architecture/
debugging/system-design questions from reaching an HR/recruiter
interviewer with no technical background. First Screening now has its own
generation instructions (`buildScreeningTemplateDraftPrompt`,
`services/ai/prompts.ts`) with an explicit HR persona, a banned-question-
type list (no coding/debugging/system-design/architecture/framework-
internals questions), and an "evidence tier" pattern for validating claimed
technical experience at a high level (has-used-professionally → duration →
current role → project → responsibility) instead of judging correctness.
A curated core question bank (`src/lib/screening-core-questions.ts` —
introduction, motivation, availability, candidate questions) is merged into
every screening draft programmatically, not AI-generated, and competency
weights are renormalized to sum to 100 after the merge. Two new,
opt-in-per-template toggles (`includeCompensationQuestion`,
`includeWorkAuthorizationCheck` — off by default, alongside the existing
English-assessment config) gate a compensation question and a Work
Authorization `MandatoryRequirement`, respectively — neither is ever
generated indiscriminately. Two additive question fields
(`requiresTechnicalKnowledge`, `technicalTermHelper`) let the AI (or a
human editor) flag when a question needs jargon explained to a non-
technical interviewer; `QuestionCard` renders that as an open-by-default
"What is this?" panel on the live rating screen. A new `RUBRIC_LABELS` map
in `stage-config.ts` (parallel to the existing `STATUS_LABELS` mechanism)
gives Screening evidence-based 0-5 labels ("No Evidence" … "Meets
Screening Expectation" … "Excellent Evidence") instead of Technical's
depth-based labels ("No Understanding" … "Meets Expected Level" …
"Excellent") — shown as a hover title on each rate-bar button — without
changing the underlying `ScoreValue`/`SCORE_TO_PERCENT` scale or the
`ScoringEngine` in any way. The Summary/report narrative now appends a
one-line disclaimer for screening sessions ("This reflects First Screening
evidence only, not a technical validation."). Verified live against the
real Anthropic API end-to-end: generating a First Screening draft for a
QA-heavy JD produced zero coding/architecture/debugging questions, correct
evidence-tier rubrics, `technicalTermHelper` text for both AI-generated
questions that referenced jargon (QA Engineering; API/performance testing
and Gitflow), and — with both toggles enabled — the Work Authorization
gate and compensation question appearing exactly once each, alongside the
unchanged Technical Interview generation path for the same position.

Phase 12 (BambooHR Integration POC) and Phase 23 (Production Readiness)
remain open.

## Stack

Next.js (App Router, TypeScript) · Tailwind + shadcn/ui · SQLite via Drizzle
ORM · Zod + React Hook Form · Vitest + Testing Library (unit/component) ·
Playwright (E2E, and PDF report generation as of Phase 10) · Claude
(`@anthropic-ai/sdk`, recommended default) or Gemini (`@google/genai`, free
tier) behind an `AIProvider` abstraction (`src/services/ai/`), live since
Phase 5/5.5.

Design tokens (colors, IBM Plex Sans/Mono typography) in
`src/app/globals.css` are ported directly from the "Calibración QA" artifact
for visual continuity, including the pass/borderline/fail/provisional/N/A
status-color semantics used from Phase 8 onward.

## Getting started

```bash
cp .env.example .env
npm install
npx playwright install chromium
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npx playwright install chromium` downloads the browser binary Playwright
needs — required for PDF report generation (Phase 10) and for
`npm run test:e2e`; skip it and everything else in the app still works,
but "Generate Report" will fail with a clear error until it's installed.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit/component tests (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | End-to-end tests (Playwright; auto-starts the dev server on port 3100) |
| `npm run db:generate` | Generate a Drizzle migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to the local SQLite file |
| `npm run db:studio` | Open Drizzle Studio against the local database |

The local SQLite file lives at `.data/dev.sqlite` (gitignored, created
automatically). See ADR-002 in the implementation plan for why SQLite was
chosen over IndexedDB/Postgres for the POC.

## Project structure

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

See §32 of the implementation plan for the full target structure as later
phases add to it.
