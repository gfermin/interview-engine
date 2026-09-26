// @vitest-environment node
//
// Plan Phase 23/§44.11 — explicitly named a "critical" regression suite by
// the task this phase implements: deleting one entity must never destroy
// an unrelated, protected entity's data. Each per-feature mutations.test.ts
// already covers "does this specific delete refuse/succeed correctly" in
// isolation; this file instead builds two independent, fully-linked chains
// (Position -> Template -> Candidate -> Session -> Decision -> Report) and
// proves that a lifecycle operation on chain A never touches chain B, and
// that a blocked delete truly changes nothing rather than partially
// applying before throwing.
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { candidates, interviewSessions, interviewTemplates, positions } from "@/db/schema";
import { archiveCandidate, deleteCandidate } from "@/features/candidates/mutations";
import {
  rateQuestion,
  recordDecision,
  updateMandatoryRequirementStatus,
} from "@/features/interviews/mutations";
import { deletePosition } from "@/features/positions/mutations";
import { deleteReport, generateReport } from "@/features/reports/mutations";
import { createCompetency, createMandatoryRequirement, createQuestion, deleteTemplate } from "@/features/templates/mutations";

/** A complete, decided chain: Position -> Template -> Competency/Question/
 * MandatoryRequirement -> Candidate -> Session -> Decision. */
async function createDecidedChain() {
  const [position] = await db
    .insert(positions)
    .values({ title: `Position ${randomUUID()}` })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({ positionId: position.id, stage: "technical", name: "Test Template" })
    .returning();
  const competency = await createCompetency(template.id, {
    name: "Programming",
    weight: 100,
    critical: true,
    expectedDepth: null,
  });
  const question = await createQuestion(template.id, {
    competencyId: competency.id,
    text: "How do you debug a flaky test?",
    difficulty: "medium",
    importance: "core",
    expected: null,
    strong: null,
    acceptable: null,
    concepts: [],
    redFlags: [],
    followUps: [],
    rubric: [],
    code: null,
    solution: null,
    jdRequirementTag: null,
    altSolutions: null,
    requiresTechnicalKnowledge: false,
    technicalTermHelper: null,
  });
  const requirement = await createMandatoryRequirement(template.id, {
    label: "Work authorization",
    description: null,
  });
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Candidate ${randomUUID()}` })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({ candidateId: candidate.id, templateId: template.id })
    .returning();

  await rateQuestion(session.id, question.id, 5);
  await updateMandatoryRequirementStatus(session.id, requirement.id, "met");
  await recordDecision(session.id, { mode: "accept" });

  return { position, template, competency, question, requirement, candidate, session };
}

describe("lifecycle operations never leak across unrelated chains", () => {
  it("deleting a dependency-free Position leaves an unrelated Position's full chain untouched", async () => {
    const protectedChain = await createDecidedChain();
    const [unrelatedPosition] = await db
      .insert(positions)
      .values({ title: `Unrelated Position ${randomUUID()}` })
      .returning();

    await deletePosition(unrelatedPosition.id);

    const reloadedPosition = await db.query.positions.findFirst({
      where: (p, { eq }) => eq(p.id, protectedChain.position.id),
    });
    const reloadedTemplate = await db.query.interviewTemplates.findFirst({
      where: (t, { eq }) => eq(t.id, protectedChain.template.id),
    });
    const reloadedSession = await db.query.interviewSessions.findFirst({
      where: (s, { eq }) => eq(s.id, protectedChain.session.id),
    });
    const decision = await db.query.interviewDecisions.findFirst({
      where: (d, { eq }) => eq(d.sessionId, protectedChain.session.id),
    });
    expect(reloadedPosition).toBeDefined();
    expect(reloadedTemplate).toBeDefined();
    expect(reloadedSession).toBeDefined();
    expect(decision?.finalDecision).toBe("PASS");
  });

  it("a blocked Position delete changes nothing — not even its unrelated draft templates", async () => {
    const chain = await createDecidedChain();
    // A second, unused draft template on the SAME position — proves the
    // refusal is atomic: it doesn't partially cascade through the safe
    // sibling before hitting the locked one.
    const [draftTemplate] = await db
      .insert(interviewTemplates)
      .values({ positionId: chain.position.id, stage: "screening", name: "Unused Draft" })
      .returning();

    await expect(deletePosition(chain.position.id)).rejects.toThrow(/cannot be permanently deleted/);

    const reloadedDraft = await db.query.interviewTemplates.findFirst({
      where: (t, { eq }) => eq(t.id, draftTemplate.id),
    });
    const reloadedLocked = await db.query.interviewTemplates.findFirst({
      where: (t, { eq }) => eq(t.id, chain.template.id),
    });
    expect(reloadedDraft).toBeDefined();
    expect(reloadedLocked).toBeDefined();
  });

  it("deleting an unrelated Template leaves another Template's competencies/questions untouched", async () => {
    const protectedChain = await createDecidedChain();
    const [unrelatedPosition] = await db
      .insert(positions)
      .values({ title: `Unrelated Position ${randomUUID()}` })
      .returning();
    const [unrelatedTemplate] = await db
      .insert(interviewTemplates)
      .values({ positionId: unrelatedPosition.id, stage: "technical", name: "Unrelated Draft" })
      .returning();

    await deleteTemplate(unrelatedTemplate.id);

    const reloadedCompetency = await db.query.competencies.findFirst({
      where: (c, { eq }) => eq(c.id, protectedChain.competency.id),
    });
    const reloadedQuestion = await db.query.questions.findFirst({
      where: (q, { eq }) => eq(q.id, protectedChain.question.id),
    });
    expect(reloadedCompetency).toBeDefined();
    expect(reloadedQuestion).toBeDefined();
  });

  it("archiving one Candidate never alters another Candidate's sessions/evaluations", async () => {
    const protectedChain = await createDecidedChain();
    const [otherCandidate] = await db
      .insert(candidates)
      .values({ name: `Other Candidate ${randomUUID()}` })
      .returning();

    await archiveCandidate(otherCandidate.id);

    const decision = await db.query.interviewDecisions.findFirst({
      where: (d, { eq }) => eq(d.sessionId, protectedChain.session.id),
    });
    const reloadedCandidate = await db.query.candidates.findFirst({
      where: (c, { eq }) => eq(c.id, protectedChain.candidate.id),
    });
    expect(decision?.finalDecision).toBe("PASS");
    expect(reloadedCandidate?.archivedAt).toBeNull();
  });

  it("a blocked Candidate delete changes nothing — the candidate, session, and decision all survive intact", async () => {
    const chain = await createDecidedChain();

    await expect(deleteCandidate(chain.candidate.id)).rejects.toThrow(/cannot be permanently deleted/);

    const reloadedCandidate = await db.query.candidates.findFirst({
      where: (c, { eq }) => eq(c.id, chain.candidate.id),
    });
    const reloadedSession = await db.query.interviewSessions.findFirst({
      where: (s, { eq }) => eq(s.id, chain.session.id),
    });
    const decision = await db.query.interviewDecisions.findFirst({
      where: (d, { eq }) => eq(d.sessionId, chain.session.id),
    });
    expect(reloadedCandidate).toBeDefined();
    expect(reloadedSession).toBeDefined();
    expect(decision?.finalDecision).toBe("PASS");
  });

  it("deleting a Report never touches the finalized Session/Decision it was generated from, or an unrelated report", async () => {
    const chain = await createDecidedChain();
    const report = await generateReport(chain.session.id);
    const unrelatedChain = await createDecidedChain();
    const unrelatedReport = await generateReport(unrelatedChain.session.id);

    await deleteReport(report.id);

    const reloadedSession = await db.query.interviewSessions.findFirst({
      where: (s, { eq }) => eq(s.id, chain.session.id),
    });
    const decision = await db.query.interviewDecisions.findFirst({
      where: (d, { eq }) => eq(d.sessionId, chain.session.id),
    });
    const reloadedUnrelatedReport = await db.query.interviewReports.findFirst({
      where: (r, { eq }) => eq(r.id, unrelatedReport.id),
    });
    expect(reloadedSession).toBeDefined();
    expect(decision?.finalDecision).toBe("PASS");
    expect(reloadedUnrelatedReport).toBeDefined();
  });
});
