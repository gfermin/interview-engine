import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JobDescriptionEditor } from "./job-description-editor";

const noopAction = vi.fn(async () => undefined);

describe("JobDescriptionEditor", () => {
  it("renders an empty textarea with a 'Save' label when there is no existing JD", () => {
    render(<JobDescriptionEditor action={noopAction} />);

    expect(screen.getByLabelText(/job description/i)).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /save job description/i })
    ).toBeInTheDocument();
  });

  it("shows the version badge and 'Update' label when editing an existing JD", () => {
    render(
      <JobDescriptionEditor
        action={noopAction}
        defaultText="We are looking for a Senior Backend Developer..."
        version={2}
      />
    );

    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update job description/i })
    ).toBeInTheDocument();
  });
});

// Note: textarea defaultValue pre-fill is deliberately not asserted here —
// see the note in position-form.test.tsx for why (React 19 <form action>
// + jsdom); verified manually in a real browser instead.
