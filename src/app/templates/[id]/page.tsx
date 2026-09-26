import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Archive, ArchiveRestore, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { LifecycleActionButton } from "@/components/lifecycle-action-button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { INTERVIEW_LANGUAGE_LABELS, type InterviewLanguage } from "@/domain/interviews/interview-language";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { difficultyBadgeClass } from "@/lib/question-style";
import { getJobDescription, getPosition } from "@/features/positions/queries";
import {
  archiveTemplateAction,
  createNewVersionAction,
  deleteCompetencyAction,
  deleteMandatoryRequirementAction,
  deleteQuestionAction,
  deleteTemplateAction,
  moveCompetencyAction,
  moveMandatoryRequirementAction,
  moveQuestionAction,
  publishTemplateAction,
  restoreTemplateAction,
  updateScoringConfigAction,
} from "@/features/templates/actions";
import { AIActionButton, RegenerateQuestionButton } from "@/features/templates/ai-components";
import {
  analyzeJobDescriptionAction,
  generateTemplateDraftAction,
  regenerateQuestionAction,
} from "@/features/templates/ai-actions";
import {
  getLatestJobAnalysis,
  getLatestTemplateDraftBlueprint,
  getTemplate,
  hasSessionsForTemplate,
  listCompetencies,
  listMandatoryRequirements,
  listQuestions,
} from "@/features/templates/queries";
import { ScoringConfigForm } from "@/features/templates/scoring-config-form";
import { NewVersionButton, PublishButton, RowActionButton } from "@/features/templates/template-actions";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  draft: "outline",
  approved: "secondary",
  locked: "default",
} as const;

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  const stage = template.stage as InterviewStage;
  const [position, competencies, mandatoryRequirements, questions, jobDescription, blueprints, hasSessions] =
    await Promise.all([
      getPosition(template.positionId),
      listCompetencies(id),
      listMandatoryRequirements(id),
      listQuestions(id),
      template.jobDescriptionId ? getJobDescription(template.jobDescriptionId) : null,
      getLatestTemplateDraftBlueprint(id),
      hasSessionsForTemplate(id),
    ]);
  const jobAnalysis = template.jobDescriptionId
    ? await getLatestJobAnalysis(template.jobDescriptionId)
    : null;
  const blueprintByCompetencyName = new Map((blueprints ?? []).map((b) => [b.competencyName, b]));

  const editable = isTemplateEditable(template);
  const isArchived = Boolean(template.archivedAt);
  const deleteCheck = !hasSessions;
  const stageConfig = getStageConfig(stage);
  const weightSum = competencies.reduce((sum, c) => sum + c.weight, 0);
  const questionsByCompetency = new Map<string, typeof questions>();
  for (const q of questions) {
    const list = questionsByCompetency.get(q.competencyId) ?? [];
    list.push(q);
    questionsByCompetency.set(q.competencyId, list);
  }

  const roleFamilyMismatch = mismatches(position?.roleFamily ?? null, jobAnalysis?.detectedRoleFamily ?? null);
  const seniorityMismatch = mismatches(position?.seniority ?? null, jobAnalysis?.detectedSeniority ?? null);

  return (
    <>
      <AppTopbar title={template.name} locale={locale} />
      <PageContainer width="wide">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-[15px]">{template.name}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {position ? (
                  <Link
                    href={`/positions/${position.id}`}
                    className="text-[12.5px] text-muted-foreground hover:underline"
                  >
                    {position.title}
                  </Link>
                ) : null}
                <Badge variant="secondary">{stageConfig.label}</Badge>
                <Badge variant="outline">
                  {INTERVIEW_LANGUAGE_LABELS[template.interviewLanguage as InterviewLanguage]}
                </Badge>
                <Badge variant="outline" className="font-mono">
                  v{template.version}
                </Badge>
                <Badge variant={STATUS_VARIANT[template.status]} className="capitalize">
                  {template.status}
                </Badge>
                {isArchived ? (
                  <Badge variant="outline">{t(locale, "templates.archivedBadge")}</Badge>
                ) : null}
              </div>
              {!editable ? (
                <p className="mt-2 max-w-md text-[11px] text-muted-foreground">
                  {template.status === "approved"
                    ? t(locale, "templates.editableNotePublished")
                    : t(locale, "templates.editableNoteLocked")}
                </p>
              ) : null}
              {!isArchived && !deleteCheck ? (
                <p className="mt-2 max-w-md text-[11px] text-muted-foreground">
                  {t(locale, "templates.cannotDeleteTemplateNote")}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {editable ? (
                <PublishButton action={publishTemplateAction.bind(null, template.id)} locale={locale} />
              ) : (
                <NewVersionButton action={createNewVersionAction.bind(null, template.id)} locale={locale} />
              )}
              {isArchived ? (
                <LifecycleActionButton
                  action={restoreTemplateAction.bind(null, template.id)}
                  label={t(locale, "templates.restoreTemplateButton")}
                  icon={<ArchiveRestore />}
                />
              ) : (
                <>
                  <LifecycleActionButton
                    action={archiveTemplateAction.bind(null, template.id)}
                    label={t(locale, "templates.archiveTemplateButton")}
                    icon={<Archive />}
                    confirmMessage={t(locale, "templates.archiveTemplateConfirm")}
                  />
                  {deleteCheck ? (
                    <LifecycleActionButton
                      action={deleteTemplateAction.bind(null, template.id)}
                      label={t(locale, "templates.deleteTemplateButton")}
                      icon={<Trash2 />}
                      variant="destructive"
                      confirmMessage={`${t(locale, "templates.deleteTemplateConfirmPrefix")}${template.name}${t(locale, "templates.deleteTemplateConfirmSuffix")}`}
                    />
                  ) : null}
                </>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "templates.jobDescriptionHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!jobDescription ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, "templates.notLinkedPrefix")}
                <Link href={`/positions/${template.positionId}`} className="underline">
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
                    action={analyzeJobDescriptionAction.bind(null, template.id)}
                    label={
                      jobAnalysis
                        ? t(locale, "templates.reAnalyzeButton")
                        : t(locale, "templates.analyzeButton")
                    }
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
                          {position?.roleFamily ?? "—"}
                          {t(locale, "templates.mismatchWarningMiddle")}
                          {position?.seniority ?? "—"}
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
                    {jobAnalysis.notes ? (
                      <p className="text-[12px] text-muted-foreground">{jobAnalysis.notes}</p>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "templates.scoringConfigurationHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            {editable ? (
              <ScoringConfigForm
                action={updateScoringConfigAction.bind(null, template.id)}
                defaultValues={{
                  passThreshold: template.passThreshold,
                  borderlineMin: template.borderlineMin,
                  criticalMin: template.criticalMin,
                  minCompletion: template.minCompletion,
                  englishRequired: template.englishRequired,
                  englishMinLevel: template.englishMinLevel,
                  includeCompensationQuestion: template.includeCompensationQuestion,
                  includeWorkAuthorizationCheck: template.includeWorkAuthorizationCheck,
                }}
                showScreeningLogisticsFields={stage === "screening"}
                locale={locale}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <ConfigStat label={t(locale, "templates.passThresholdStatLabel")} value={template.passThreshold} />
                <ConfigStat label={t(locale, "templates.borderlineMinStatLabel")} value={template.borderlineMin} />
                <ConfigStat label={t(locale, "templates.criticalMinStatLabel")} value={template.criticalMin} />
                <ConfigStat label={t(locale, "templates.minCompletionStatLabel")} value={template.minCompletion} />
                <ConfigStat
                  label={t(locale, "templates.englishRequiredStatLabel")}
                  value={
                    template.englishRequired
                      ? `${t(locale, "templates.englishRequiredYesPrefix")}${template.englishMinLevel}${t(locale, "templates.englishRequiredYesSuffix")}`
                      : t(locale, "templates.noLabel")
                  }
                  suffix=""
                />
                {stage === "screening" ? (
                  <>
                    <ConfigStat
                      label={t(locale, "templates.includeCompensationQuestionLabel")}
                      value={
                        template.includeCompensationQuestion
                          ? t(locale, "templates.yesLabel")
                          : t(locale, "templates.noLabel")
                      }
                      suffix=""
                    />
                    <ConfigStat
                      label={t(locale, "templates.includeWorkAuthorizationCheckLabel")}
                      value={
                        template.includeWorkAuthorizationCheck
                          ? t(locale, "templates.yesLabel")
                          : t(locale, "templates.noLabel")
                      }
                      suffix=""
                    />
                  </>
                ) : null}
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[13.5px]">{t(locale, "templates.competenciesHeading")}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={weightSum === 100 ? "secondary" : "outline"}>
                {t(locale, "templates.weightsPrefix")}
                {weightSum}%
              </Badge>
              {editable ? (
                <ButtonLink size="sm" variant="outline" href={`/templates/${id}/competencies/new`}>
                  <Plus /> {t(locale, "templates.addCompetencyLabel")}
                </ButtonLink>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {competencies.length === 0 ? (
              <div className="flex flex-col gap-3 px-6 pb-4">
                <p className="text-sm text-muted-foreground">
                  {t(locale, "templates.noCompetenciesMessage")}
                </p>
                {editable && jobAnalysis ? (
                  <AIActionButton
                    action={generateTemplateDraftAction.bind(null, template.id)}
                    label={t(locale, "templates.generateDraftButton")}
                    pendingLabel={t(locale, "templates.generatingDraftButton")}
                    locale={locale}
                  />
                ) : null}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "templates.tableName")}</TableHead>
                    <TableHead>{t(locale, "templates.tableWeight")}</TableHead>
                    <TableHead>{t(locale, "templates.criticalLabel")}</TableHead>
                    <TableHead>{t(locale, "templates.tableExpectedDepth")}</TableHead>
                    {editable ? <TableHead className="text-right">{t(locale, "templates.tableActions")}</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competencies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.weight}%</TableCell>
                      <TableCell>
                        {c.critical ? (
                          <Badge variant="destructive">{t(locale, "templates.criticalLabel")}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {c.expectedDepth ?? "—"}
                      </TableCell>
                      {editable ? (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <RowActionButton
                              action={moveCompetencyAction.bind(null, id, c.id, "up")}
                              icon={<ChevronUp />}
                              label={t(locale, "templates.moveUpLabel")}
                            />
                            <RowActionButton
                              action={moveCompetencyAction.bind(null, id, c.id, "down")}
                              icon={<ChevronDown />}
                              label={t(locale, "templates.moveDownLabel")}
                            />
                            <ButtonLink
                              variant="ghost"
                              size="icon-sm"
                              href={`/templates/${id}/competencies/${c.id}/edit`}
                              aria-label={t(locale, "templates.editLabel")}
                            >
                              <Pencil />
                            </ButtonLink>
                            <RowActionButton
                              action={deleteCompetencyAction.bind(null, id, c.id)}
                              icon={<Trash2 />}
                              label={t(locale, "templates.deleteLabel")}
                              variant="destructive"
                              confirmMessage={`${t(locale, "templates.deleteCompetencyConfirmPrefix")}${c.name}${t(locale, "templates.deleteCompetencyConfirmSuffix")}`}
                            />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[13.5px]">{t(locale, "templates.mandatoryRequirementsHeading")}</CardTitle>
            {editable ? (
              <ButtonLink size="sm" variant="outline" href={`/templates/${id}/requirements/new`}>
                <Plus /> {t(locale, "templates.addRequirementButton")}
              </ButtonLink>
            ) : null}
          </CardHeader>
          <CardContent className="p-0">
            {mandatoryRequirements.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">
                {t(locale, "templates.noRequirementsMessage")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "templates.tableRequirement")}</TableHead>
                    <TableHead>{t(locale, "templates.descriptionLabel")}</TableHead>
                    {editable ? <TableHead className="text-right">{t(locale, "templates.tableActions")}</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mandatoryRequirements.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="max-w-[320px] truncate text-muted-foreground">
                        {r.description ?? "—"}
                      </TableCell>
                      {editable ? (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <RowActionButton
                              action={moveMandatoryRequirementAction.bind(null, id, r.id, "up")}
                              icon={<ChevronUp />}
                              label={t(locale, "templates.moveUpLabel")}
                            />
                            <RowActionButton
                              action={moveMandatoryRequirementAction.bind(null, id, r.id, "down")}
                              icon={<ChevronDown />}
                              label={t(locale, "templates.moveDownLabel")}
                            />
                            <ButtonLink
                              variant="ghost"
                              size="icon-sm"
                              href={`/templates/${id}/requirements/${r.id}/edit`}
                              aria-label={t(locale, "templates.editLabel")}
                            >
                              <Pencil />
                            </ButtonLink>
                            <RowActionButton
                              action={deleteMandatoryRequirementAction.bind(null, id, r.id)}
                              icon={<Trash2 />}
                              label={t(locale, "templates.deleteLabel")}
                              variant="destructive"
                              confirmMessage={`${t(locale, "templates.deleteRequirementConfirmPrefix")}${r.label}${t(locale, "templates.deleteRequirementConfirmSuffix")}`}
                            />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "templates.questionsHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {competencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, "templates.addCompetencyBeforeQuestionsPrefix")}
                <Link href={`/templates/${id}/competencies/new`} className="underline">
                  {t(locale, "templates.competencyLinkText")}
                </Link>
                {t(locale, "templates.addCompetencyBeforeQuestionsSuffix")}
              </p>
            ) : (
              competencies.map((c, index) => {
                const competencyQuestions = questionsByCompetency.get(c.id) ?? [];
                const blueprint = blueprintByCompetencyName.get(c.name);
                return (
                  <div key={c.id} className="flex flex-col gap-2">
                    {index > 0 ? <Separator /> : null}
                    <div className="flex items-center justify-between">
                      <h3 className="text-[12.5px] font-semibold">{c.name}</h3>
                      {editable ? (
                        <ButtonLink
                          size="xs"
                          variant="outline"
                          href={`/templates/${id}/questions/new?competencyId=${c.id}`}
                        >
                          <Plus /> {t(locale, "templates.addQuestionTitle")}
                        </ButtonLink>
                      ) : null}
                    </div>
                    {blueprint ? (
                      <details className="text-[11px] text-muted-foreground">
                        <summary className="cursor-pointer">{t(locale, "templates.generationBlueprintSummary")}</summary>
                        <div className="mt-1 flex flex-col gap-0.5 rounded-lg border border-border bg-muted/40 p-2">
                          <p>
                            <span className="font-medium">{t(locale, "templates.coverageLabel")}</span>
                            {blueprint.coverage}
                          </p>
                          <p>
                            <span className="font-medium">{t(locale, "templates.questionMixLabel")}</span>
                            {blueprint.questionTypeMix}
                          </p>
                        </div>
                      </details>
                    ) : null}
                    {competencyQuestions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t(locale, "templates.noQuestionsMessage")}</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {competencyQuestions.map((q) => (
                          <li
                            key={q.id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                          >
                            <div className="flex flex-col gap-1">
                              <p className="text-[12.5px] leading-snug">{q.text}</p>
                              <div className="flex flex-wrap gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`capitalize ${difficultyBadgeClass(q.difficulty)}`}
                                >
                                  {q.difficulty}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {q.importance}
                                </Badge>
                                {q.jdRequirementTag ? (
                                  <Badge variant="secondary" className="font-normal normal-case">
                                    {t(locale, "templates.jdTagPrefix")}
                                    {q.jdRequirementTag}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                            {editable ? (
                              <div className="flex shrink-0 items-start gap-1">
                                <RowActionButton
                                  action={moveQuestionAction.bind(null, id, q.id, "up")}
                                  icon={<ChevronUp />}
                                  label={t(locale, "templates.moveUpLabel")}
                                />
                                <RowActionButton
                                  action={moveQuestionAction.bind(null, id, q.id, "down")}
                                  icon={<ChevronDown />}
                                  label={t(locale, "templates.moveDownLabel")}
                                />
                                <RegenerateQuestionButton
                                  action={regenerateQuestionAction.bind(null, id, q.id)}
                                  locale={locale}
                                />
                                <ButtonLink
                                  variant="ghost"
                                  size="icon-sm"
                                  href={`/templates/${id}/questions/${q.id}/edit`}
                                  aria-label={t(locale, "templates.editLabel")}
                                >
                                  <Pencil />
                                </ButtonLink>
                                <RowActionButton
                                  action={deleteQuestionAction.bind(null, id, q.id)}
                                  icon={<Trash2 />}
                                  label={t(locale, "templates.deleteLabel")}
                                  variant="destructive"
                                  confirmMessage={t(locale, "templates.deleteQuestionConfirm")}
                                />
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}

/** Non-blocking mismatch check (plan §39.3) — the system never overrides
 * the human's selection, it only flags a divergence for review. */
function mismatches(selected: string | null, detected: string | null): boolean {
  if (!selected || !detected) return false;
  return selected.trim().toLowerCase() !== detected.trim().toLowerCase();
}

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
