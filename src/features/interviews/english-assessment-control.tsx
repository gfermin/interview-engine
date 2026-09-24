import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateEnglishAssessmentAction } from "./actions";

const LEVELS = [1, 2, 3, 4, 5];

/**
 * The artifact's hardcoded English module (plan §9), generalized to the
 * first `SupplementaryAssessment` — a 1-5 level, same rate-bar interaction
 * pattern as a question's score, but recorded once per session rather than
 * once per question.
 */
export function EnglishAssessmentControl({
  sessionId,
  currentLevel,
}: {
  sessionId: string;
  currentLevel: number | null;
}) {
  return (
    <div className="flex items-center gap-1">
      {LEVELS.map((level) => (
        <form key={level} action={updateEnglishAssessmentAction.bind(null, sessionId, level)}>
          <Button
            type="submit"
            size="icon-sm"
            variant={currentLevel === level ? "default" : "outline"}
            aria-label={`English level ${level}`}
          >
            {level}
          </Button>
        </form>
      ))}
      <form action={updateEnglishAssessmentAction.bind(null, sessionId, null)}>
        <Button type="submit" size="icon-sm" variant="ghost" aria-label="Clear" title="Clear">
          <X />
        </Button>
      </form>
    </div>
  );
}
