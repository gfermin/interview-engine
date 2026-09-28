import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t, type Locale } from "@/lib/i18n";
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
  locale = "en",
}: {
  sessionId: string;
  currentLevel: number | null;
  locale?: Locale;
}) {
  return (
    <div className="flex items-center gap-1">
      {LEVELS.map((level) => (
        <form key={level} action={updateEnglishAssessmentAction.bind(null, sessionId, level)}>
          <Button
            type="submit"
            size="icon-sm"
            variant={currentLevel === level ? "default" : "outline"}
            aria-label={`${t(locale, "interview.englishLevelAriaLabelPrefix")}${level}`}
          >
            {level}
          </Button>
        </form>
      ))}
      <form action={updateEnglishAssessmentAction.bind(null, sessionId, null)}>
        <Button
          type="submit"
          size="icon-sm"
          variant="ghost"
          aria-label={t(locale, "interview.clearRatingLabel")}
          title={t(locale, "interview.clearRatingLabel")}
        >
          <X />
        </Button>
      </form>
    </div>
  );
}
