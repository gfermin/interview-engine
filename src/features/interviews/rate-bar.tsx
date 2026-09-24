import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuestionScore, ScoreValue } from "@/domain/scoring/types";
import { rateQuestionAction } from "./actions";

const SCORES: ScoreValue[] = [0, 1, 2, 3, 4, 5];

/**
 * The artifact's 0-5/N/A rate bar (plan §2.3/§30), ported as plain forms —
 * each button is its own one-field form bound to a literal score value, the
 * same fire-and-forget pattern the templates feature already uses for
 * row actions. No client JS is required for the rating itself; only the
 * notes field (NotesField) needs to be a Client Component.
 */
export function RateBar({
  sessionId,
  questionId,
  currentValue,
}: {
  sessionId: string;
  questionId: string;
  currentValue: QuestionScore;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {SCORES.map((score) => (
        <form key={score} action={rateQuestionAction.bind(null, sessionId, questionId, score)}>
          <Button
            type="submit"
            size="icon-sm"
            variant={currentValue === score ? "default" : "outline"}
            aria-label={`Rate ${score}`}
          >
            {score}
          </Button>
        </form>
      ))}
      <form action={rateQuestionAction.bind(null, sessionId, questionId, "na")}>
        <Button type="submit" size="sm" variant={currentValue === "na" ? "default" : "outline"}>
          N/A
        </Button>
      </form>
      <form action={rateQuestionAction.bind(null, sessionId, questionId, null)}>
        <Button
          type="submit"
          size="icon-sm"
          variant="ghost"
          aria-label="Clear rating"
          title="Clear rating"
        >
          <X />
        </Button>
      </form>
    </div>
  );
}
