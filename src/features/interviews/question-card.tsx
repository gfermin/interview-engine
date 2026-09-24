import { Badge } from "@/components/ui/badge";
import type { QuestionScore } from "@/domain/scoring/types";
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
}

/**
 * The artifact's question card (plan §2.2/§30): collapsed-by-default
 * disclosure panels for the expected answer/scoring guide/follow-ups, a
 * 0-5/N/A rate bar, and inline notes — reused near-verbatim as a Server
 * Component, since only the rate bar's forms and the notes field's blur
 * handler need any client interactivity, and neither needs to live at this
 * level.
 */
export function QuestionCard({
  sessionId,
  question,
  currentValue,
  notes,
  editable = true,
}: {
  sessionId: string;
  question: QuestionCardQuestion;
  currentValue: QuestionScore;
  notes: string | null;
  editable?: boolean;
}) {
  const hasReference =
    question.expected ||
    question.strong ||
    question.acceptable ||
    question.concepts.length > 0 ||
    question.redFlags.length > 0;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] leading-snug">{question.text}</p>
          <div className="flex gap-1.5">
            <Badge variant="outline" className="capitalize">
              {question.difficulty}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {question.importance}
            </Badge>
          </div>
        </div>
        {editable ? (
          <RateBar sessionId={sessionId} questionId={question.id} currentValue={currentValue} />
        ) : (
          <Badge variant="outline" className="font-mono">
            {currentValue === null ? "Unrated" : currentValue === "na" ? "N/A" : `Score: ${currentValue}`}
          </Badge>
        )}
      </div>

      {question.code ? (
        <details>
          <summary className="cursor-pointer text-[11.5px] text-muted-foreground">
            Code exercise
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
          </div>
        </details>
      ) : null}

      {hasReference ? (
        <details>
          <summary className="cursor-pointer text-[11.5px] text-muted-foreground">
            Expected answer / scoring guide
          </summary>
          <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-[12px]">
            {question.expected ? (
              <p>
                <span className="font-medium">Expected: </span>
                {question.expected}
              </p>
            ) : null}
            {question.strong ? (
              <p>
                <span className="font-medium">Strong answer: </span>
                {question.strong}
              </p>
            ) : null}
            {question.acceptable ? (
              <p>
                <span className="font-medium">Acceptable: </span>
                {question.acceptable}
              </p>
            ) : null}
            {question.concepts.length > 0 ? (
              <p>
                <span className="font-medium">Key concepts: </span>
                {question.concepts.join(", ")}
              </p>
            ) : null}
            {question.redFlags.length > 0 ? (
              <p>
                <span className="font-medium text-destructive">Red flags: </span>
                {question.redFlags.join(", ")}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}

      {question.followUps.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-[11.5px] text-muted-foreground">
            Follow-ups
          </summary>
          <ul className="mt-2 list-disc rounded-lg border border-border bg-muted/40 p-3 pl-8 text-[12px]">
            {question.followUps.map((followUp) => (
              <li key={followUp}>{followUp}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {question.rubric.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-[11.5px] text-muted-foreground">
            Rubric (0-5)
          </summary>
          <ul className="mt-2 flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3 text-[12px]">
            {question.rubric.map((line, index) => (
              <li key={index}>{line}</li>
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
