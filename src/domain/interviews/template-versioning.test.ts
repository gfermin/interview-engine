import { describe, expect, it } from "vitest";
import {
  canCreateNewVersion,
  canStartSession,
  checkPublishable,
  isTemplateEditable,
  statusAfterSessionCreated,
  sumWeights,
} from "./template-versioning";

describe("isTemplateEditable", () => {
  it("is editable only while draft", () => {
    expect(isTemplateEditable({ status: "draft" })).toBe(true);
    expect(isTemplateEditable({ status: "approved" })).toBe(false);
    expect(isTemplateEditable({ status: "locked" })).toBe(false);
  });
});

describe("canCreateNewVersion", () => {
  it("allows forking approved or locked templates, not draft", () => {
    expect(canCreateNewVersion({ status: "draft" })).toBe(false);
    expect(canCreateNewVersion({ status: "approved" })).toBe(true);
    expect(canCreateNewVersion({ status: "locked" })).toBe(true);
  });
});

describe("sumWeights", () => {
  it("sums competency weights", () => {
    expect(sumWeights([{ weight: 60 }, { weight: 40 }])).toBe(100);
    expect(sumWeights([])).toBe(0);
  });
});

describe("canStartSession", () => {
  it("allows starting a session against approved or locked, not draft", () => {
    expect(canStartSession({ status: "draft" })).toBe(false);
    expect(canStartSession({ status: "approved" })).toBe(true);
    expect(canStartSession({ status: "locked" })).toBe(true);
  });
});

describe("statusAfterSessionCreated", () => {
  it("locks an approved template on first use", () => {
    expect(statusAfterSessionCreated({ status: "approved" })).toBe("locked");
  });

  it("leaves an already-locked template locked", () => {
    expect(statusAfterSessionCreated({ status: "locked" })).toBe("locked");
  });

  it("leaves a draft untouched (guarded by canStartSession before this runs)", () => {
    expect(statusAfterSessionCreated({ status: "draft" })).toBe("draft");
  });
});

describe("checkPublishable", () => {
  it("rejects a non-draft template", () => {
    const result = checkPublishable({ status: "approved" }, [{ weight: 100 }]);
    expect(result.publishable).toBe(false);
    expect(result.errors).toContain("Only a draft template can be published.");
  });

  it("rejects a template with no competencies", () => {
    const result = checkPublishable({ status: "draft" }, []);
    expect(result.publishable).toBe(false);
    expect(result.errors).toContain("Add at least one competency before publishing.");
  });

  it("rejects weights that don't sum to 100", () => {
    const result = checkPublishable({ status: "draft" }, [
      { weight: 60 },
      { weight: 30 },
    ]);
    expect(result.publishable).toBe(false);
    expect(result.errors.some((e) => e.includes("90%"))).toBe(true);
  });

  it("accepts a draft with competencies summing to exactly 100", () => {
    const result = checkPublishable({ status: "draft" }, [
      { weight: 60 },
      { weight: 40 },
    ]);
    expect(result.publishable).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
