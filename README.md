# Interview Platform

A local, JD-driven interview assessment platform — the universal successor to
the "Calibración QA" reference artifact. Full analysis, architecture
decisions, data model, and phased implementation plan live in
[`docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md`](../Prompts/docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md)
in the sibling `Prompts` project.

**Status:** Phase 6 (Interview Template Review / Approval) complete.
Phases 0-6 done: app shell + SQLite/Drizzle (1), ScoringEngine/
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
credits (5.5, plan §38 addendum), and per-question AI "Regenerate" — re-
calls AI for one question only, replacing it in place (same id/order) so
the rest of the template and sibling questions are untouched (6). Most of
Phase 6's stated scope (edit-in-place, delete, reorder, Approve & Publish,
the mismatch banner) had already shipped in Phases 4/5; regenerate was the
genuinely new piece. Requires `ANTHROPIC_API_KEY` **or** `GEMINI_API_KEY`
in `.env` to actually call an AI provider — without either, AI actions
surface a clear error and everything else keeps working offline.
Candidate Management (Phase 7) is next.

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
  app/                  # Next.js routes (positions, templates)
  components/
    layout/              # App shell (sidebar, topbar)
    ui/                   # shadcn/ui primitives
  db/                   # Drizzle schema + client
  domain/
    scoring/              # ScoringEngine/CompletenessEngine/CriticalRequirementEngine (pure)
    interviews/            # Stage config (labels/modules) + template versioning rules (pure)
  features/
    positions/            # Position + Job Description CRUD
    templates/             # Template/Competency/MandatoryRequirement/Question CRUD + versioning + AI actions
  services/
    ai/                    # AIProvider interface, provider.ts selector, ClaudeProvider + GeminiProvider, prompts, Zod output schemas
  lib/                  # Shared utilities
e2e/                  # Playwright specs
```

See §32 of the implementation plan for the full target structure
(`services/ai`, `services/pdf`, etc.) as later phases add them.
