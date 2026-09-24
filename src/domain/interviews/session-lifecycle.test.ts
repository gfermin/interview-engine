import { describe, expect, it } from "vitest";
import { isSessionEditable } from "./session-lifecycle";

describe("isSessionEditable", () => {
  it("is editable only while in_progress", () => {
    expect(isSessionEditable({ status: "in_progress" })).toBe(true);
    expect(isSessionEditable({ status: "completed" })).toBe(false);
    expect(isSessionEditable({ status: "decided" })).toBe(false);
  });
});
