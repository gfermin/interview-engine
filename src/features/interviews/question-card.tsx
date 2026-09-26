import { Badge } from "@/components/ui/badge";
import { SCORE_TO_PERCENT, type QuestionScore } from "@/domain/scoring/types";
import type { InterviewStage } from "@/domain/interviews/stage-config";
import { t, type Locale } from "@/lib/i18n";
import { difficultyBadgeClass } from "@/lib/question-style";
import { updateNotesAction } from "./actions";
import { NotesField } from "./notes-field";
import { RateBar } from "./rate-bar";

interface QuestionCardQuestion {
  id: string;
  text: string;
  difficulty: string;
  importance: string;
  expected: string | null;
  strong: string | null;
  acceptable: string | null;
  concepts: string[];
  redFlags: string[];
  followUps: string[];
  rubric: string[];
  code: string | null;
  solution: string | null;
  jdRequirementTag: string | null;
  altSolutions: string | null;
  technicalTermHelper: string | null;
}

function scorePercentLabel(locale: Locale, value: QuestionScore): string {
  if (value === null) return t(locale, "interview.unratedLower");
  if (value === "na") return t(locale, "interview.excludedLower");
  return `${SCORE_TO_PERCENT[value]}%`;
}

/**
 * The artifact's question card (plan §2.2/§30, restored to closer visual
 * parity in Phase 14/§41): collapsed-by-default disclosure panels — Expected
 * Answer, Scoring Guide, Follow-Ups, in that order, matching the artifact's
 * three named buttons exactly — a live per-question score%, color-coded
 * difficulty, a "rated" left-border accent once scored, and inline notes.
 * Reused as a Server Component, since only the rate bar's forms and the
 * notes field's blur handler need any client interactivity, and neither
 * needs to live at this level.
 */
export function QuestionCard({
  sessionId,
  question,
  currentValue,
  notes,
  editable = true,
  stage = "technical",
  locale = "en",
}: {
  sessionId: string;
  question: QuestionCardQuestion;
  currentValue: QuestionScore;
  notes: string | null;
  editable?: boolean;
  stage?: InterviewStage;
  locale?: Locale;
}) {
  const hasReference =
    question.expected ||
    question.strong ||
    question.acceptable ||
    question.concepts.length > 0 ||
    question.redFlags.length > 0;
  const isRated = typeof currentValue === "number";

  return (
    <li
      className={`flex flex-col gap-3 rounded-lg border border-border p-3 ${
        isRated ? "border-l-[3px] border-l-primary" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] leading-snug">{question.text}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={`capitalize ${difficultyBadgeClass(question.difficulty)}`}>
              {question.difficulty}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {question.importance}
            </Badge>
            {question.jdRequirementTag ? (
              <Badge variant="secondary" className="font-normal normal-case">
                {t(locale, "interview.jdTagPrefix")}
                {question.jdRequirementTag}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {editable ? (
            <RateBar
              sessionId={sessionId}
              questionId={question.id}
              currentValue={currentValue}
              stage={stage}
            />
          ) : (
            <Badge variant="outline" className="font-mono">
              {currentValue === null
                ? t(locale, "interview.unrated")
                : currentValue === "na"
                  ? "N/A"
                  : `${t(locale, "interview.scorePrefix")}${currentValue}`}
            </Badge>
          )}
          <span className="font-mono text-[11px] text-muted-foreground">
            {scorePercentLabel(locale, currentValue)}
          </span>
        </div>
      </div>

      {question.code ? (
        <details>
          <summary className="cursor-pointer text-[11.5px] text-muted-foreground">
            {t(locale, "interview.codeExercise")}
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <pre className="overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[11.5px] whitespace-pre-wrap">
              {question.code}
            </pre>
            {question.solution ? (
              <pre className="overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[11.5px] whitespace-pre-wrap">
                {question.solution}
              </pre>
            ) : null}
            {question.altSolutions ? (
              <p className="text-[12px]">
                <span className="font-medium">{t(locale, "interview.otherValidApproachesPrefix")}</span>
                {question.altSolutions}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}

      {question.technicalTermHelper ? (
        <details className="rounded-lg border border-dashed border-border" open>
          <summary className="cursor-pointer px-3 py-2 text-[11.5px] font-medium text-muted-foreground">
            {t(locale, "interview.whatIsThisLabel")}
          </summary>
          <p className="px-3 pb-3 text-[12px]">{question.technicalTermHelper}</p>
        </details>
      ) : null}

      {hasReference ? (
        <details>
          <summary className="cursor-pointer text-[11.5px] text-muted-foreground">
            {t(locale, "interview.expectedAnswer")}
          </summary>
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-[12px]">
            {question.expected ? (
              <p>
                <span className="font-medium">{t(locale, "interview.expectedPrefix")}</span>
                {question.expected}
              </p>
            ) : null}
            {question.strong ? (
              <p>
                <span className="font-medium">{t(locale, "interview.strongAnswerPrefix")}</span>
                {question.strong}
              </p>
            ) : null}
            {question.acceptable ? (
              <p>
                <span className="font-medium">{t(locale, "interview.acceptablePrefix")}</span>
                {question.acceptable}
              </p>
            ) : null}
            {question.concepts.length > 0 ? (
              <p>
                <span className="font-medium">{t(locale, "interview.keyConceptsPrefix")}</span>
                {question.concepts.join(", ")}
              </p>
            ) : null}
            {question.redFlags.length > 0 ? (
              <p>
                <span className="font-medium text-destructive">{t(locale, "interview.redFlagsPrefix")}</span>
                {question.redFlags.join(", ")}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}

      {question.rubric.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-[11.5px] text-muted-foreground">
            {t(locale, "interview.scoringGuide")}
          </summary>
          <ul className="mt-2 flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3 text-[12px]">
            {question.rubric.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {question.followUps.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-[11.5px] text-muted-foreground">
            {t(locale, "interview.followUps")}
          </summary>
          <ul className="mt-2 list-disc rounded-lg border border-border bg-muted/40 p-3 pl-8 text-[12px]">
            {question.followUps.map((followUp) => (
              <li key={followUp}>{followUp}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {editable ? (
        <NotesField
          action={updateNotesAction.bind(null, sessionId, question.id)}
          defaultValue={notes}
        />
      ) : notes ? (
        <p className="rounded-lg border border-border bg-muted/40 p-2 text-[12.5px] whitespace-pre-wrap">
          {notes}
        </p>
      ) : null}
    </li>
  );
}
