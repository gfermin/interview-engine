import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DecisionForm } from "./decision-form";

// This config's vitest.config.mts doesn't set `test.globals: true`, so
// @testing-library/react's own auto-cleanup (which detects a *global*
// `afterEach`) isn't reliably wired up — explicit cleanup avoids DOM from
// one `it` bleeding into the next (several `it`s below render the same
// button labels, e.g. "Accept").
afterEach(cleanup);

const noopAction = vi.fn(async () => undefined);

// §40.5 item 8 / §40.1 regression test: DecisionForm's `mode` state used to
// be seeded once from `existingDecision?.mode ?? ...`, which short-circuits
// on the mode being merely *defined*, not on it being valid for the
// *current* calculated status. A Reopen + re-rate that moves the status
// (e.g. PASS -> BORDERLINE) without this component unmounting would then
// leave an invalid mode selected, and every submit would hit the domain
// layer's backstop error with no way to fix it from the UI.
describe("DecisionForm", () => {
  it("BORDERLINE with no existing decision offers a forced Pass/Fail call, not accept/override", () => {
    render(<DecisionForm action={noopAction} status="BORDERLINE" stage="technical" />);

    expect(screen.getByRole("button", { name: /Force Pass/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Force Fail/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("PASS with an existing accept decision offers accept/override, not a forced call", () => {
    render(
      <DecisionForm
        action={noopAction}
        status="PASS"
        stage="technical"
        existingDecision={{ mode: "accept", finalDecision: "PASS", reason: null }}
      />
    );

    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Override" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Force Pass/i })).not.toBeInTheDocument();
  });

  it("§40.1: an existing 'accept' decision that's stale for the current BORDERLINE status falls back to a forced call instead of rendering an invalid accept/override pair", () => {
    // Simulates a Reopen + re-rate that moved the calculated status from
    // PASS to BORDERLINE — existingDecision still reflects the prior PASS
    // decision's mode.
    render(
      <DecisionForm
        action={noopAction}
        status="BORDERLINE"
        stage="technical"
        existingDecision={{ mode: "accept", finalDecision: "PASS", reason: null }}
      />
    );

    expect(screen.getByRole("button", { name: /Force Pass/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Force Fail/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Override" })).not.toBeInTheDocument();
  });

  it("a stale forced_call decision that's no longer valid for a PASS status falls back to accept/override", () => {
    render(
      <DecisionForm
        action={noopAction}
        status="PASS"
        stage="technical"
        existingDecision={{ mode: "forced_call", finalDecision: "PASS", reason: "Earlier borderline call." }}
      />
    );

    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Override" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Force Pass/i })).not.toBeInTheDocument();
  });

  it("uses each stage's own vocabulary for the forced-call button labels", () => {
    render(<DecisionForm action={noopAction} status="BORDERLINE" stage="screening" />);

    // Screening's statusLabelFor maps PASS/FAIL to its own vocabulary
    // (plan §40.6) rather than always reading "PASS"/"FAIL".
    expect(screen.queryByRole("button", { name: "Force PASS" })).not.toBeInTheDocument();
  });

  it("shows a required reason field for a forced call but not for a plain accept", () => {
    const { rerender } = render(
      <DecisionForm
        key="PASS"
        action={noopAction}
        status="PASS"
        stage="technical"
        existingDecision={{ mode: "accept", finalDecision: "PASS", reason: null }}
      />
    );
    expect(screen.queryByLabelText(/reason/i)).not.toBeInTheDocument();

    // A bare re-render with the same `key` would NOT pick up the new status
    // in `mode`'s state (useState's initial value only runs once) — that's
    // exactly why the parent (summary/page.tsx) keys DecisionForm by
    // `status`. Changing the key here, matching that parent, is what
    // actually forces the remount this test means to exercise.
    rerender(<DecisionForm key="BORDERLINE" action={noopAction} status="BORDERLINE" stage="technical" />);
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
  });
});
