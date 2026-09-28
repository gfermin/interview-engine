import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canRecordDecision, type DecisionMode, type FinalDecision } from "@/domain/interviews/decision";
import { statusLabelFor, type InterviewStage } from "@/domain/interviews/stage-config";
import type { InterviewStatus } from "@/domain/scoring/types";
import type { FormActionState } from "@/lib/form-action-state";
import { t, type Locale } from "@/lib/i18n";
import { DecisionForm } from "./decision-form";
import { ToneBadge } from "./status-badge";

/** Narrative Summary + Decision (plan Phase 34/AUDIT-021) — extracted out
 * of the Summary page's monolithic body. A pure markup/prop split, no
 * behavior change. */
export function SummaryDecisionSection({
  stage,
  status,
  reason,
  narrative,
  recordedDecision,
  recordDecisionAction,
  locale,
}: {
  stage: InterviewStage;
  status: InterviewStatus;
  reason: string;
  narrative: string;
  recordedDecision: { mode: DecisionMode; finalDecision: FinalDecision; reason: string | null } | null;
  recordDecisionAction: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  locale: Locale;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-[13.5px]">{t(locale, "interview.narrativeSummaryHeading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-[12.5px] leading-relaxed">
            {narrative}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[13.5px]">{t(locale, "interview.decisionHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {recordedDecision ? (
            <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/40 p-3 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{t(locale, "interview.recordedLabel")}</span>
                <ToneBadge
                  tone={recordedDecision.finalDecision === "PASS" ? "pass" : "fail"}
                  label={statusLabelFor(stage, recordedDecision.finalDecision)}
                />
                <span className="text-muted-foreground">({recordedDecision.mode.replace("_", " ")})</span>
              </div>
              {recordedDecision.reason ? <p className="text-muted-foreground">{recordedDecision.reason}</p> : null}
            </div>
          ) : null}

          {canRecordDecision(status) ? (
            <DecisionForm
              // Forces a clean remount when the calculated status changes
              // (e.g. after a Reopen + re-rate) — see the note in
              // decision-form.tsx (§40.1) for why this can't just rely on
              // useState's initial-value guard alone.
              key={status}
              action={recordDecisionAction}
              status={status}
              stage={stage}
              existingDecision={recordedDecision}
              locale={locale}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {reason}
              {t(locale, "interview.decisionPendingPrefix")}
              {statusLabelFor(stage, "PASS")}
              {t(locale, "interview.decisionPendingSeparator")}
              {statusLabelFor(stage, "FAIL")}
              {t(locale, "interview.decisionPendingOr")}
              {statusLabelFor(stage, "BORDERLINE")}
              {t(locale, "interview.decisionPendingSuffix")}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
