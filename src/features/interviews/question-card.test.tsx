import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QuestionCard } from "./question-card";

afterEach(cleanup);

const BASE_QUESTION = {
  id: "q1",
  text: "Explain the Page Object Model.",
  difficulty: "medium",
  importance: "core",
  expected: "Encapsulates locators/interactions per screen.",
  strong: null,
  acceptable: null,
  concepts: [],
  redFlags: [],
  followUps: [],
  rubric: ["0 — no understanding", "5 — excellent"],
  code: null,
  solution: null,
  jdRequirementTag: null,
  altSolutions: null,
};

describe("QuestionCard", () => {
  it("shows a live score percentage matching the 0-5 -> percent mapping", () => {
    render(
      <QuestionCard
        sessionId="s1"
        question={BASE_QUESTION}
        currentValue={4}
        notes={null}
        editable={false}
      />
    );
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("shows 'excluded' for N/A and 'unrated' for null, not a percentage", () => {
    const { rerender } = render(
      <QuestionCard sessionId="s1" question={BASE_QUESTION} currentValue="na" notes={null} editable={false} />
    );
    expect(screen.getByText("excluded")).toBeInTheDocument();

    rerender(
      <QuestionCard sessionId="s1" question={BASE_QUESTION} currentValue={null} notes={null} editable={false} />
    );
    expect(screen.getByText("unrated")).toBeInTheDocument();
  });

  it("renders Expected Answer, Scoring Guide, and Follow-Ups in that order, matching the artifact", () => {
    render(
      <QuestionCard
        sessionId="s1"
        question={{ ...BASE_QUESTION, followUps: ["What about shared components?"] }}
        currentValue={null}
        notes={null}
        editable={false}
      />
    );
    const summaries = screen.getAllByRole("group").map((el) => el.querySelector("summary")?.textContent);
    expect(summaries).toEqual(["Expected answer", "Scoring guide", "Follow-ups"]);
  });
});
