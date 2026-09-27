import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotesField } from "./notes-field";

afterEach(cleanup);

// AUDIT-010/Phase 27 — notes used to autosave on blur only, so closing the
// tab mid-edit silently lost everything typed since the last blur. A
// debounced autosave must fire on its own, without requiring blur.
describe("NotesField", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("autosaves after the debounce window elapses, without requiring blur", async () => {
    const action = vi.fn(async () => undefined);
    const { container } = render(<NotesField action={action} defaultValue={null} />);
    const textarea = container.querySelector("textarea")!;

    fireEvent.change(textarea, { target: { value: "Strong on debugging." } });
    expect(action).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("does not autosave when nothing changed", async () => {
    const action = vi.fn(async () => undefined);
    render(<NotesField action={action} defaultValue="Existing note." />);

    await vi.advanceTimersByTimeAsync(2000);

    expect(action).not.toHaveBeenCalled();
  });

  it("still saves immediately on blur, matching the prior behavior", async () => {
    const action = vi.fn(async () => undefined);
    const { container } = render(<NotesField action={action} defaultValue={null} />);
    const textarea = container.querySelector("textarea")!;

    fireEvent.change(textarea, { target: { value: "Quick note." } });
    fireEvent.blur(textarea);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("saving on blur cancels the pending debounced save (no duplicate submit)", async () => {
    const action = vi.fn(async () => undefined);
    const { container } = render(<NotesField action={action} defaultValue={null} />);
    const textarea = container.querySelector("textarea")!;

    fireEvent.change(textarea, { target: { value: "Quick note." } });
    fireEvent.blur(textarea);
    await vi.advanceTimersByTimeAsync(2000);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("flushes a pending save when the tab becomes hidden", () => {
    const action = vi.fn(async () => undefined);
    const { container } = render(<NotesField action={action} defaultValue={null} />);
    const textarea = container.querySelector("textarea")!;

    fireEvent.change(textarea, { target: { value: "About to close the tab." } });
    expect(action).not.toHaveBeenCalled();

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(action).toHaveBeenCalledTimes(1);
  });
});
