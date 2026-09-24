import { describe, expect, it } from "vitest";
import { canGenerateReport, canReopenSession, isSessionDecided, isSessionEditable } from "./session-lifecycle";

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

describe("isSessionDecided", () => {
  it("is true only for decided", () => {
    expect(isSessionDecided({ status: "in_progress" })).toBe(false);
    expect(isSessionDecided({ status: "completed" })).toBe(false);
    expect(isSessionDecided({ status: "decided" })).toBe(true);
  });
});

describe("canReopenSession", () => {
  it("is available exactly when editing is not (completed or decided)", () => {
    expect(canReopenSession({ status: "in_progress" })).toBe(false);
    expect(canReopenSession({ status: "completed" })).toBe(true);
    expect(canReopenSession({ status: "decided" })).toBe(true);
  });
});
