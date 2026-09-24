import { describe, expect, it } from "vitest";
import { canGenerateReport, isSessionEditable } from "./session-lifecycle";

describe("isSessionEditable", () => {
  it("is editable only while in_progress", () => {
    expect(isSessionEditable({ status: "in_progress" })).toBe(true);
    expect(isSessionEditable({ status: "completed" })).toBe(false);
    expect(isSessionEditable({ status: "decided" })).toBe(false);
  });
});

describe("canGenerateReport", () => {
  it("is possible only once a session is decided", () => {
    expect(canGenerateReport({ status: "in_progress" })).toBe(false);
    expect(canGenerateReport({ status: "completed" })).toBe(false);
    expect(canGenerateReport({ status: "decided" })).toBe(true);
  });
});
