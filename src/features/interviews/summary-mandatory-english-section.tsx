import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MandatoryRequirementStatus } from "@/domain/scoring/types";
import { t, type Locale } from "@/lib/i18n";
import { EnglishAssessmentControl } from "./english-assessment-control";
import { MandatoryRequirementControl } from "./mandatory-requirement-control";
import { type BadgeTone, ToneBadge } from "./status-badge";

// A MandatoryRequirement is a boolean knockout gate (plan §4.3/§19) — the
// same pass/fail/na color language the calculated interview status uses
// applies directly: met=pass, not_met=fail, unknown=na (no evidence yet,
// same as a critical competency with no evidence — not itself a failure).
const MANDATORY_STATUS_TONE: Record<MandatoryRequirementStatus, BadgeTone> = {
  met: "pass",
  not_met: "fail",
  unknown: "na",
};

function mandatoryStatusLabel(locale: Locale, status: MandatoryRequirementStatus): string {
  const key =
    status === "met" ? "mandatoryStatusMet" : status === "not_met" ? "mandatoryStatusNotMet" : "mandatoryStatusUnknown";
  return t(locale, `interview.${key}`);
}

interface MandatoryRequirementRow {
  id: string;
  label: string;
  description: string | null;
}

/** Mandatory Requirements + (when the stage has the module) English
 * Assessment (plan Phase 34/AUDIT-021) — extracted out of the Summary
 * page's monolithic body. A pure markup/prop split, no behavior change. */
export function SummaryMandatoryAndEnglishSection({
  sessionId,
  mandatoryRequirements,
  mrStatusByRequirementId,
  isDecided,
  showEnglishAssessment,
  englishLevel,
  locale,
}: {
  sessionId: string;
  mandatoryRequirements: MandatoryRequirementRow[];
  mrStatusByRequirementId: Map<string, MandatoryRequirementStatus>;
  isDecided: boolean;
  showEnglishAssessment: boolean;
  englishLevel: number | null;
  locale: Locale;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-[13.5px]">{t(locale, "interview.mandatoryRequirementsHeading")}</CardTitle>
        </CardHeader>
        <CardContent>
          {mandatoryRequirements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(locale, "interview.noMandatoryRequirementsNote")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {mandatoryRequirements.map((requirement) => (
                <li
                  key={requirement.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-[12.5px] font-medium">{requirement.label}</p>
                    {requirement.description ? (
                      <p className="text-[11.5px] text-muted-foreground">{requirement.description}</p>
                    ) : null}
                  </div>
                  {isDecided ? (
                    <ToneBadge
                      tone={MANDATORY_STATUS_TONE[mrStatusByRequirementId.get(requirement.id) ?? "unknown"]}
                      label={mandatoryStatusLabel(locale, mrStatusByRequirementId.get(requirement.id) ?? "unknown")}
                    />
                  ) : (
                    <MandatoryRequirementControl
                      sessionId={sessionId}
                      requirementId={requirement.id}
                      currentStatus={mrStatusByRequirementId.get(requirement.id) ?? "unknown"}
                      locale={locale}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {showEnglishAssessment ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "interview.englishAssessmentHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-[11.5px] text-muted-foreground">{t(locale, "interview.englishAssessmentNote")}</p>
            {isDecided ? (
              <Badge variant="outline" className="w-fit">
                {t(locale, "interview.levelPrefix")}
                {englishLevel ?? t(locale, "interview.notAssessed")}
              </Badge>
            ) : (
              <EnglishAssessmentControl sessionId={sessionId} currentLevel={englishLevel} locale={locale} />
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
