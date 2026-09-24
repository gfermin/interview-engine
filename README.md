# Interview Platform

A local, JD-driven interview assessment platform — the universal successor to
the "Calibración QA" reference artifact. Full analysis, architecture
decisions, data model, and phased implementation plan live in
[`docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md`](../Prompts/docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md)
in the sibling `Prompts` project.

**Status:** Phase 4 (Interview Template Engine) complete. Phases 0-4 done:
app shell + SQLite/Drizzle (1), ScoringEngine/CompletenessEngine/
CriticalRequirementEngine + full schema (2), Position + Job Description
management with Role Family/Seniority (3), and the Template builder —
Competency/MandatoryRequirement/Question CRUD, reordering, draft/approved/
locked versioning (ADR-008), and the per-stage (Technical/Screening) config
map — with manually-authored content (4). AI generation (Phase 5) is next.

## Stack

Next.js (App Router, TypeScript) · Tailwind + shadcn/ui · SQLite via Drizzle
ORM · Zod + React Hook Form · Vitest + Testing Library (unit/component) ·
Playwright (E2E, and PDF generation from Phase 10 onward) · Claude (Anthropic
API) behind an `AIProvider` abstraction, wired up starting Phase 5.

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
    templates/             # Template/Competency/MandatoryRequirement/Question CRUD + versioning
  lib/                  # Shared utilities
e2e/                  # Playwright specs
```

See §32 of the implementation plan for the full target structure
(`services/ai`, `services/pdf`, etc.) as later phases add them.
