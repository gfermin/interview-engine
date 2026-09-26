import { describe, expect, it } from "vitest";
import { buildInterviewReportDisplayName, buildInterviewReportFilename } from "./naming";

const BASE = {
  candidateName: "John Doe",
  positionTitle: "Senior QA Automation Engineer",
  stageLabel: "Technical Interview",
  generatedAt: new Date("2026-09-25T12:00:00Z"),
  reportId: "abcdef12-3456-7890-abcd-ef1234567890",
};

describe("buildInterviewReportDisplayName", () => {
  it("formats as Candidate — Position — Stage, candidate first", () => {
    expect(buildInterviewReportDisplayName(BASE)).toBe(
      "John Doe — Senior QA Automation Engineer — Technical Interview"
    );
  });
});

describe("buildInterviewReportFilename", () => {
  it("produces a readable, deterministic filename with candidate/position/stage/date", () => {
    const name = buildInterviewReportFilename(BASE);
    expect(name).toBe("John_Doe_Senior_QA_Automation_Engineer_Technical_Interview_2026-09-25_abcdef12.pdf");
  });

  it("strips accents", () => {
    const name = buildInterviewReportFilename({ ...BASE, candidateName: "José Pérez" });
    expect(name.startsWith("Jose_Perez_")).toBe(true);
  });

  it("handles apostrophes and hyphens", () => {
    const name = buildInterviewReportFilename({ ...BASE, candidateName: "Mary O'Brien-Smith" });
    expect(name.startsWith("Mary_O_Brien_Smith_")).toBe(true);
  });

  it("handles spaces and special characters without producing double underscores", () => {
    const name = buildInterviewReportFilename({
      ...BASE,
      positionTitle: "Backend Dev (Node.js / TypeScript)!!",
    });
    expect(name).not.toMatch(/__/);
    expect(name).toMatch(/^[A-Za-z0-9_.-]+\.pdf$/);
  });

  it("truncates very long names/titles instead of producing an unbounded filename", () => {
    const longName = "A".repeat(200);
    const name = buildInterviewReportFilename({ ...BASE, candidateName: longName });
    expect(name.length).toBeLessThan(250);
  });

  it("is unique for duplicate candidate names via the report id suffix", () => {
    const first = buildInterviewReportFilename({ ...BASE, reportId: "11111111-0000-0000-0000-000000000000" });
    const second = buildInterviewReportFilename({ ...BASE, reportId: "22222222-0000-0000-0000-000000000000" });
    expect(first).not.toBe(second);
  });

  it("is unique across multiple interviews for the same candidate on the same day", () => {
    const morning = buildInterviewReportFilename({ ...BASE, reportId: "aaaaaaaa-1111-1111-1111-111111111111" });
    const afternoon = buildInterviewReportFilename({ ...BASE, reportId: "bbbbbbbb-2222-2222-2222-222222222222" });
    expect(morning).not.toBe(afternoon);
  });

  it("always ends in .pdf and contains no path separators", () => {
    const name = buildInterviewReportFilename(BASE);
    expect(name.endsWith(".pdf")).toBe(true);
    expect(name).not.toMatch(/[/\\]/);
  });
});
