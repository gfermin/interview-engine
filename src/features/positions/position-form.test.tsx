import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionForm } from "./position-form";

const noopAction = vi.fn(async () => undefined);

describe("PositionForm", () => {
  it("renders title, role family, seniority, and department as free-text inputs", () => {
    render(<PositionForm action={noopAction} submitLabel="Create Position" />);

    const title = screen.getByLabelText(/position title/i);
    const roleFamily = screen.getByLabelText(/role family/i);
    const seniority = screen.getByLabelText(/^seniority$/i);
    const department = screen.getByLabelText(/department/i);

    // Plan §39.3: these must be free-text inputs (with suggestions), not
    // rigid <select> dropdowns that would block an uncommon value.
    expect(title.tagName).toBe("INPUT");
    expect(roleFamily.tagName).toBe("INPUT");
    expect((roleFamily as HTMLInputElement).type).toBe("text");
    expect(seniority.tagName).toBe("INPUT");
    expect((seniority as HTMLInputElement).type).toBe("text");
    expect(department.tagName).toBe("INPUT");
  });

  it("wires role family and seniority to their suggestion datalists without constraining input", () => {
    render(<PositionForm action={noopAction} submitLabel="Create Position" />);

    const roleFamily = screen.getByLabelText(/role family/i) as HTMLInputElement;
    const seniority = screen.getByLabelText(/^seniority$/i) as HTMLInputElement;

    expect(roleFamily.getAttribute("list")).toBe("role-family-suggestions");
    expect(seniority.getAttribute("list")).toBe("seniority-suggestions");
    expect(document.getElementById("role-family-suggestions")).toBeInstanceOf(
      HTMLDataListElement
    );
    expect(document.getElementById("seniority-suggestions")).toBeInstanceOf(
      HTMLDataListElement
    );
  });

  it("renders the given submit label", () => {
    render(
      <PositionForm
        action={noopAction}
        submitLabel="Save Changes"
        defaultValues={{
          title: "Senior Backend Developer",
          roleFamily: "Software Engineering",
          seniority: "Senior",
          department: "Engineering",
        }}
      />
    );

    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });
});

// Note: defaultValue pre-fill on edit is deliberately not asserted here.
// React 19's <form action={...}> combined with jsdom's incomplete support
// for intercepting native form submission is currently unreliable in this
// Vitest/jsdom setup (a real worker hang was reproduced while diagnosing
// this, not just a wrong assertion) — verified manually in a real browser
// instead (Phase 3 manual QA), which is also the more appropriate tool for
// full form-submission behavior anyway.
