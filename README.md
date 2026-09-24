# Interview Platform

A local, JD-driven interview assessment platform — the universal successor to
the "Calibración QA" reference artifact. Full analysis, architecture
decisions, data model, and phased implementation plan live in
[`docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md`](../Prompts/docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md)
in the sibling `Prompts` project.

**Status:** Phase 8 (Live Interview Engine) complete.
Phases 0-8 done: app shell + SQLite/Drizzle (1), ScoringEngine/
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
persisted alongside for later phases to read without recomputing (8).
Requires `ANTHROPIC_API_KEY` **or** `GEMINI_API_KEY` in `.env` to actually
call an AI provider — without either, AI actions surface a clear error and
everything else keeps working offline.
Scoring & Decision Engine (Phase 9) is next.

## Stack

Next.js (App Router, TypeScript) · Tailwind + shadcn/ui · SQLite via Drizzle
ORM · Zod + React Hook Form · Vitest + Testing Library (unit/component) ·
Playwright (E2E, and PDF generation from Phase 10 onward) · Claude
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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
  app/                  # Next.js routes (positions, templates, candidates, interviews)
  components/
    layout/              # App shell (sidebar, topbar)
    ui/                   # shadcn/ui primitives
  db/                   # Drizzle schema + client
  domain/
    scoring/              # ScoringEngine/CompletenessEngine/CriticalRequirementEngine (pure)
    interviews/            # Stage config, template versioning, session-scoring composition, section-status (all pure)
  features/
    positions/            # Position + Job Description CRUD
    templates/             # Template/Competency/MandatoryRequirement/Question CRUD + versioning + AI actions
    candidates/            # Candidate CRUD + start-Interview-Session flow
    interviews/            # Live rating screen: rate/notes mutations + actions, question card, rate bar, section nav
  services/
    ai/                    # AIProvider interface, provider.ts selector, ClaudeProvider + GeminiProvider, prompts, Zod output schemas
  lib/                  # Shared utilities
e2e/                  # Playwright specs
```

See §32 of the implementation plan for the full target structure
(`services/ai`, `services/pdf`, etc.) as later phases add them.
