import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPositionFieldMismatched } from "@/domain/positions/mismatch";
import { t, type Locale } from "@/lib/i18n";
import type { AIActionState } from "./ai-actions";
import { AIActionButton } from "./ai-components";

interface JobDescriptionRow {
  version: number;
  rawText: string;
}

interface JobAnalysisRow {
  detectedRoleFamily: string | null;
  detectedSeniority: string | null;
  mandatoryRequirements: string[];
  preferredRequirements: string[];
  optionalRequirements: string[];
  notes: string | null;
}

function RequirementList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd>
        {items.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <ul className="list-disc pl-4">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

/** The Job Description Card (plan Phase 34/AUDIT-021) — raw JD text,
 * Analyze action, and the Job Analysis's detected role/seniority (with the
 * non-blocking mismatch warning against the Position's own selections) and
 * requirement lists. Extracted out of `app/templates/[id]/page.tsx`. */
export function TemplateJobDescriptionSection({
  positionId,
  editable,
  jobDescription,
  jobAnalysis,
  positionRoleFamily,
  positionSeniority,
  analyzeJobDescriptionAction,
  locale,
}: {
  positionId: string;
  editable: boolean;
  jobDescription: JobDescriptionRow | null;
  jobAnalysis: JobAnalysisRow | null;
  positionRoleFamily: string | null;
  positionSeniority: string | null;
  analyzeJobDescriptionAction: (prevState: AIActionState | undefined) => Promise<AIActionState | undefined>;
  locale: Locale;
}) {
  const roleFamilyMismatch = isPositionFieldMismatched(positionRoleFamily, jobAnalysis?.detectedRoleFamily ?? null);
  const seniorityMismatch = isPositionFieldMismatched(positionSeniority, jobAnalysis?.detectedSeniority ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[13.5px]">{t(locale, "templates.jobDescriptionHeading")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!jobDescription ? (
          <p className="text-sm text-muted-foreground">
            {t(locale, "templates.notLinkedPrefix")}
            <Link href={`/positions/${positionId}`} className="underline">
              {t(locale, "templates.positionLabel")}
            </Link>
            {t(locale, "templates.notLinkedSuffix")}
          </p>
        ) : (
          <>
            <details>
              <summary className="cursor-pointer text-[12.5px] text-muted-foreground">
                {t(locale, "templates.jdTextVersionPrefix")}
                {jobDescription.version}
                {t(locale, "templates.jdTextVersionSuffix")}
              </summary>
              <p className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[12.5px] whitespace-pre-wrap">
                {jobDescription.rawText}
              </p>
            </details>

            {editable ? (
              <AIActionButton
                action={analyzeJobDescriptionAction}
                label={jobAnalysis ? t(locale, "templates.reAnalyzeButton") : t(locale, "templates.analyzeButton")}
                pendingLabel={t(locale, "templates.analyzingButton")}
                locale={locale}
              />
            ) : null}

            {jobAnalysis ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={roleFamilyMismatch ? "destructive" : "secondary"}>
                    {t(locale, "templates.detectedRolePrefix")}
                    {jobAnalysis.detectedRoleFamily ?? "—"}
                  </Badge>
                  <Badge variant={seniorityMismatch ? "destructive" : "secondary"}>
                    {t(locale, "templates.detectedSeniorityPrefix")}
                    {jobAnalysis.detectedSeniority ?? "—"}
                  </Badge>
                </div>
                {roleFamilyMismatch || seniorityMismatch ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[12px] text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <p>
                      {t(locale, "templates.mismatchWarningPrefix")}
                      {positionRoleFamily ?? "—"}
                      {t(locale, "templates.mismatchWarningMiddle")}
                      {positionSeniority ?? "—"}
                      {t(locale, "templates.mismatchWarningSuffix")}
                    </p>
                  </div>
                ) : null}
                <dl className="grid grid-cols-1 gap-2 text-[12.5px] sm:grid-cols-3">
                  <RequirementList
                    label={t(locale, "templates.jdMandatoryLabel")}
                    items={jobAnalysis.mandatoryRequirements}
                  />
                  <RequirementList
                    label={t(locale, "templates.jdPreferredLabel")}
                    items={jobAnalysis.preferredRequirements}
                  />
                  <RequirementList
                    label={t(locale, "templates.jdOptionalLabel")}
                    items={jobAnalysis.optionalRequirements}
                  />
                </dl>
                {jobAnalysis.notes ? <p className="text-[12px] text-muted-foreground">{jobAnalysis.notes}</p> : null}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
