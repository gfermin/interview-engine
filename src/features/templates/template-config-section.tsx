import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewStage } from "@/domain/interviews/stage-config";
import type { FormActionState } from "@/lib/form-action-state";
import { t, type Locale } from "@/lib/i18n";
import { ScoringConfigForm, type ScoringConfigFormValues } from "./scoring-config-form";

function ConfigStat({
  label,
  value,
  suffix = "%",
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm">
        {value}
        {suffix}
      </dd>
    </div>
  );
}

/** The Scoring Configuration Card (plan Phase 34/AUDIT-021) — an editable
 * form when the template is still editable, a read-only stat grid
 * otherwise. Extracted out of `app/templates/[id]/page.tsx`. */
export function TemplateConfigSection({
  editable,
  stage,
  defaultValues,
  updateScoringConfigAction,
  locale,
}: {
  editable: boolean;
  stage: InterviewStage;
  defaultValues: ScoringConfigFormValues;
  updateScoringConfigAction: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[13.5px]">{t(locale, "templates.scoringConfigurationHeading")}</CardTitle>
      </CardHeader>
      <CardContent>
        {editable ? (
          <ScoringConfigForm
            action={updateScoringConfigAction}
            defaultValues={defaultValues}
            showScreeningLogisticsFields={stage === "screening"}
            showCodeExerciseField={stage === "technical"}
            locale={locale}
          />
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <ConfigStat label={t(locale, "templates.passThresholdStatLabel")} value={defaultValues.passThreshold} />
            <ConfigStat label={t(locale, "templates.borderlineMinStatLabel")} value={defaultValues.borderlineMin} />
            <ConfigStat label={t(locale, "templates.criticalMinStatLabel")} value={defaultValues.criticalMin} />
            <ConfigStat label={t(locale, "templates.minCompletionStatLabel")} value={defaultValues.minCompletion} />
            <ConfigStat
              label={t(locale, "templates.englishRequiredStatLabel")}
              value={
                defaultValues.englishRequired
                  ? `${t(locale, "templates.englishRequiredYesPrefix")}${defaultValues.englishMinLevel}${t(locale, "templates.englishRequiredYesSuffix")}`
                  : t(locale, "templates.noLabel")
              }
              suffix=""
            />
            {stage === "screening" ? (
              <>
                <ConfigStat
                  label={t(locale, "templates.includeCompensationQuestionLabel")}
                  value={
                    defaultValues.includeCompensationQuestion
                      ? t(locale, "templates.yesLabel")
                      : t(locale, "templates.noLabel")
                  }
                  suffix=""
                />
                <ConfigStat
                  label={t(locale, "templates.includeWorkAuthorizationCheckLabel")}
                  value={
                    defaultValues.includeWorkAuthorizationCheck
                      ? t(locale, "templates.yesLabel")
                      : t(locale, "templates.noLabel")
                  }
                  suffix=""
                />
              </>
            ) : null}
            {stage === "technical" ? (
              <ConfigStat
                label={t(locale, "templates.includeCodeExercisesLabel")}
                value={
                  defaultValues.includeCodeExercises ? t(locale, "templates.yesLabel") : t(locale, "templates.noLabel")
                }
                suffix=""
              />
            ) : null}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
