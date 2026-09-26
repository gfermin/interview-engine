import { describe, expect, it } from "vitest";
import {
  canDeleteSession,
  canGenerateReport,
  canReopenSession,
  isSessionDecided,
  isSessionEditable,
} from "./session-lifecycle";

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

// Plan Phase 23/§44.4/§44.8: a session can be hard-deleted only before a
// human decision exists. A `decided` session represents a real hiring
// evaluation and is archive-only, never hard-deleted, regardless of state.
describe("canDeleteSession", () => {
  it("allows deleting in_progress or completed sessions", () => {
    expect(canDeleteSession({ status: "in_progress" })).toBe(true);
    expect(canDeleteSession({ status: "completed" })).toBe(true);
  });

  it("refuses to delete a decided session", () => {
    expect(canDeleteSession({ status: "decided" })).toBe(false);
  });
});
