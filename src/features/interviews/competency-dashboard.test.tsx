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
});
