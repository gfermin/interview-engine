import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CompetencyDashboard, type CompetencyDashboardEntry } from "./competency-dashboard";

afterEach(cleanup);

function entry(overrides: Partial<CompetencyDashboardEntry> = {}): CompetencyDashboardEntry {
  return {
    competencyId: "c1",
    name: "Automation",
    weight: 20,
    critical: false,
    percent: 60,
    evaluated: 3,
    na: 0,
    criticalHasEvidence: false,
    criticalMeets: false,
    criticalMin: 50,
    ...overrides,
  };
}

describe("CompetencyDashboard", () => {
  it("shows the critical-fail warning only when a critical competency has evidence and fails its bar", () => {
    render(
      <CompetencyDashboard
        entries={[
          entry({
            critical: true,
            percent: 40,
            criticalHasEvidence: true,
            criticalMeets: false,
          }),
        ]}
      />
    );
    expect(screen.getByText(/Below the required critical minimum/i)).toBeInTheDocument();
  });

  it("does not show the warning for a critical competency with no evidence yet", () => {
    render(
      <CompetencyDashboard
        entries={[
          entry({
            critical: true,
            percent: null,
            criticalHasEvidence: false,
            criticalMeets: false,
          }),
        ]}
      />
    );
    expect(screen.queryByText(/Below the required critical minimum/i)).not.toBeInTheDocument();
  });

  it("does not show the warning for a critical competency that meets its bar", () => {
    render(
      <CompetencyDashboard
        entries={[
          entry({
            critical: true,
            percent: 80,
            criticalHasEvidence: true,
            criticalMeets: true,
          }),
        ]}
      />
    );
    expect(screen.queryByText(/Below the required critical minimum/i)).not.toBeInTheDocument();
  });

  it("does not show a Critical badge for a non-critical competency", () => {
    render(<CompetencyDashboard entries={[entry({ critical: false })]} />);
    expect(screen.queryByText("Critical")).not.toBeInTheDocument();
  });

  // AUDIT-022/Phase 33 (L-08) — non-critical competency status must carry a
  // text label, not rely on color alone.
  describe("text label alongside the color coding", () => {
    it("labels a high percent as a Strength", () => {
      render(<CompetencyDashboard entries={[entry({ percent: 85, criticalMin: 50 })]} />);
      expect(screen.getByText("Strength")).toBeInTheDocument();
    });

    it("labels a mid percent as Borderline", () => {
      render(<CompetencyDashboard entries={[entry({ percent: 60, criticalMin: 50 })]} />);
      expect(screen.getByText("Borderline")).toBeInTheDocument();
    });

    it("labels a percent below the critical minimum as a Concern", () => {
      render(<CompetencyDashboard entries={[entry({ percent: 40, criticalMin: 50 })]} />);
      expect(screen.getByText("Concern")).toBeInTheDocument();
    });

    it("labels a null percent with the no-evidence text, not Strength/Borderline/Concern", () => {
      render(<CompetencyDashboard entries={[entry({ percent: null })]} />);
      expect(screen.getByText("No evidence yet")).toBeInTheDocument();
    });
  });
});
