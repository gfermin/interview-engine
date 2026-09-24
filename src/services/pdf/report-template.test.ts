import { describe, expect, it } from "vitest";
import { buildReportHtml, type ReportData } from "./report-template";

const baseData: ReportData = {
  generatedAt: new Date("2026-01-15T10:00:00Z"),
  candidateName: "Jordan Rivera",
  candidateEmail: "jordan@example.com",
  positionTitle: "Senior Backend Developer",
  roleFamily: "Software Engineering",
  seniority: "Senior",
  stageLabel: "Technical Interview",
  templateName: "Senior Backend Developer — Technical Interview",
  templateVersion: 1,
  statusLabel: "Pass",
  overall: 82.4,
  completion: 100,
  reason: "Overall score meets the passing threshold.",
  competencies: [
    {
      name: "Programming",
      weight: 60,
      critical: true,
      expectedDepth: "Explains WHY, not just HOW.",
      percent: 90,
      hasEvidence: true,
      meetsCriticalMin: true,
    },
    {
      name: "SQL",
      weight: 40,
      critical: false,
      expectedDepth: null,
      percent: 40,
      hasEvidence: true,
      meetsCriticalMin: null,
    },
  ],
  mandatoryRequirements: [{ label: "Work authorization", description: null, status: "met" }],
  englishAssessment: { level: 4, required: false, minLevel: 3 },
  decision: { mode: "accept", finalDecision: "PASS", reason: null },
  narrative: "Jordan Rivera was evaluated for Senior Backend Developer...",
};

describe("buildReportHtml", () => {
  it("includes every plan-required field (plan §24)", () => {
    const html = buildReportHtml(baseData);

    // candidate/position/stage/date
    expect(html).toContain("Jordan Rivera");
    expect(html).toContain("Senior Backend Developer");
    expect(html).toContain("Technical Interview");
    expect(html).toContain(baseData.generatedAt.toLocaleString());

    // scores/status
    expect(html).toContain("82%");
    expect(html).toContain("100%");
    expect(html).toContain("Pass");

    // decision
    expect(html).toContain("PASS");
    expect(html).toContain("accept");

    // competency breakdown
    expect(html).toContain("Programming");
    expect(html).toContain("SQL");
    expect(html).toContain("90%");

    // mandatory requirements
    expect(html).toContain("Work authorization");
    expect(html).toContain("Met");

    // narrative
    expect(html).toContain("Jordan Rivera was evaluated for");
  });

  it("shows the override reason when present", () => {
    const html = buildReportHtml({
      ...baseData,
      decision: { mode: "override", finalDecision: "FAIL", reason: "Didn't hold up under follow-up." },
    });
    expect(html).toContain("Didn't hold up under follow-up.");
  });

  it("flags a critical competency below its minimum", () => {
    const html = buildReportHtml({
      ...baseData,
      competencies: [
        {
          name: "Programming",
          weight: 100,
          critical: true,
          expectedDepth: null,
          percent: 20,
          hasEvidence: true,
          meetsCriticalMin: false,
        },
      ],
    });
    expect(html).toContain("Below critical minimum");
  });

  it("omits the English section entirely when the stage doesn't offer it", () => {
    const html = buildReportHtml({ ...baseData, englishAssessment: null });
    expect(html).not.toContain("English Assessment");
  });

  it("escapes HTML-significant characters from free text fields", () => {
    const html = buildReportHtml({
      ...baseData,
      candidateName: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
