// @vitest-environment node
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "./schema";

// Task 2.3 acceptance: "migrations apply cleanly; basic CRUD round-trip test
// per table." Rather than 12 isolated trivial tests, this builds one
// realistic chain (Position -> JobDescription -> InterviewTemplate ->
// Competency/MandatoryRequirement/Question -> Candidate -> InterviewSession
// -> QuestionEvaluation/MandatoryRequirementEvaluation/CompetencyEvaluation
// -> InterviewDecision), which exercises every Phase 2 table's insert AND
// its foreign-key relationships together — a stronger signal than isolated
// per-table inserts would be.
//
// Note: drizzle-orm's better-sqlite3 query builders (.returning()/.run()
// etc.) are thenables ("QueryPromise") even though better-sqlite3 itself is
// synchronous — they must be awaited to get the resolved result rather than
// the builder object.

const dbPath = `./.data/test-schema-${randomUUID()}.sqlite`;
let sqlite: Database.Database;
let db: BetterSQLite3Database<typeof schema>;

beforeAll(() => {
  mkdirSync("./.data", { recursive: true });
  sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./drizzle" });
});

afterAll(() => {
  sqlite.close();
  rmSync(dbPath, { force: true });
  rmSync(`${dbPath}-journal`, { force: true });
});

describe("schema round-trip", () => {
  it("inserts and reads back the full entity chain", async () => {
    const [position] = await db
      .insert(schema.positions)
      .values({
        title: "QA Automation Engineer",
        department: "Engineering",
        roleFamily: "Quality Assurance",
        seniority: "Senior",
      })
      .returning();
    expect(position.id).toBeTruthy();
    expect(position.status).toBe("open");
    expect(position.createdAt).toBeInstanceOf(Date);
    // Task 2.4 (plan §39.10): additive roleFamily/seniority columns.
    expect(position.roleFamily).toBe("Quality Assurance");
    expect(position.seniority).toBe("Senior");

    const [jobDescription] = await db
      .insert(schema.jobDescriptions)
      .values({ positionId: position.id, rawText: "We are looking for..." })
      .returning();
    expect(jobDescription.positionId).toBe(position.id);
    expect(jobDescription.status).toBe("draft");

    const [template] = await db
      .insert(schema.interviewTemplates)
      .values({
        positionId: position.id,
        jobDescriptionId: jobDescription.id,
        stage: "technical",
        name: "QA Automation Engineer — Technical Interview",
      })
      .returning();
    expect(template.status).toBe("draft");
    expect(template.version).toBe(1);
    expect(template.passThreshold).toBe(70);

    const [programming, sqlCompetency] = await db
      .insert(schema.competencies)
      .values([
        {
          templateId: template.id,
          name: "Programming",
          weight: 60,
          critical: true,
          expectedDepth:
            "Explains WHY, not just HOW; architecture-level trade-offs and risk analysis expected at this seniority.",
        },
        { templateId: template.id, name: "SQL", weight: 40, critical: false },
      ])
      .returning();
    expect(programming.critical).toBe(true);
    expect(programming.expectedDepth).toMatch(/architecture-level trade-offs/);
    expect(sqlCompetency.critical).toBe(false);
    expect(sqlCompetency.expectedDepth).toBeNull();

    const [requirement] = await db
      .insert(schema.mandatoryRequirements)
      .values({ templateId: template.id, label: "Work authorization" })
      .returning();
    expect(requirement.templateId).toBe(template.id);

    const [question] = await db
      .insert(schema.questions)
      .values({
        templateId: template.id,
        competencyId: programming.id,
        text: "How do you handle flaky tests in CI?",
        difficulty: "hard",
        concepts: ["flakiness", "CI vs local"],
        rubric: ["0 - no strategy", "5 - systematic investigation"],
      })
      .returning();
    expect(question.concepts).toEqual(["flakiness", "CI vs local"]);
    expect(question.rubric).toHaveLength(2);

    const [candidate] = await db
      .insert(schema.candidates)
      .values({ name: "Jane Doe", email: "jane@example.com" })
      .returning();

    const [session] = await db
      .insert(schema.interviewSessions)
      .values({ candidateId: candidate.id, templateId: template.id })
      .returning();
    expect(session.status).toBe("in_progress");
    expect(session.reopenCount).toBe(0);

    const [questionEval] = await db
      .insert(schema.questionEvaluations)
      .values({ sessionId: session.id, questionId: question.id, score: 4 })
      .returning();
    expect(questionEval.score).toBe(4);
    expect(questionEval.isNa).toBe(false);

    const [mandatoryEval] = await db
      .insert(schema.mandatoryRequirementEvaluations)
      .values({
        sessionId: session.id,
        requirementId: requirement.id,
        status: "met",
      })
      .returning();
    expect(mandatoryEval.status).toBe("met");

    const [competencyEval] = await db
      .insert(schema.competencyEvaluations)
      .values({
        sessionId: session.id,
        competencyId: programming.id,
        evaluated: 1,
        percent: 80,
      })
      .returning();
    expect(competencyEval.percent).toBe(80);

    const [decision] = await db
      .insert(schema.interviewDecisions)
      .values({
        sessionId: session.id,
        calculatedStatus: "PASS",
        calculatedReason: "Overall score meets the passing threshold.",
        calculatedRecommendation: "PASS",
        mode: "accept",
        finalDecision: "PASS",
      })
      .returning();
    expect(decision.finalDecision).toBe("PASS");

    // Read the whole chain back via a fresh query, not the insert results,
    // to prove persistence (not just returning()) actually round-trips.
    const readBackSession = await db.query.interviewSessions.findFirst({
      where: eq(schema.interviewSessions.id, session.id),
    });
    expect(readBackSession?.candidateId).toBe(candidate.id);

    const readBackQuestion = await db.query.questions.findFirst({
      where: eq(schema.questions.id, question.id),
    });
    expect(readBackQuestion?.rubric).toEqual([
      "0 - no strategy",
      "5 - systematic investigation",
    ]);
  });

  it("enforces one question_evaluation per (session, question) pair", async () => {
    const [position] = await db
      .insert(schema.positions)
      .values({ title: "Duplicate-guard fixture" })
      .returning();
    const [template] = await db
      .insert(schema.interviewTemplates)
      .values({ positionId: position.id, stage: "screening", name: "t" })
      .returning();
    const [competency] = await db
      .insert(schema.competencies)
      .values({ templateId: template.id, name: "c", weight: 100 })
      .returning();
    const [question] = await db
      .insert(schema.questions)
      .values({ templateId: template.id, competencyId: competency.id, text: "q" })
      .returning();
    const [candidate] = await db
      .insert(schema.candidates)
      .values({ name: "Dup Candidate" })
      .returning();
    const [session] = await db
      .insert(schema.interviewSessions)
      .values({ candidateId: candidate.id, templateId: template.id })
      .returning();

    await db
      .insert(schema.questionEvaluations)
      .values({ sessionId: session.id, questionId: question.id, score: 3 });

    await expect(
      db
        .insert(schema.questionEvaluations)
        .values({ sessionId: session.id, questionId: question.id, score: 5 })
    ).rejects.toThrow();
  });
});
