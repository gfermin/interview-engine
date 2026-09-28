import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import type { InterviewLanguage } from "@/domain/interviews/interview-language";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
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
import { TemplateCompetenciesSection } from "@/features/templates/template-competencies-section";
import { TemplateConfigSection } from "@/features/templates/template-config-section";
import { TemplateHeaderSection } from "@/features/templates/template-header-section";
import { TemplateJobDescriptionSection } from "@/features/templates/template-job-description-section";
import { TemplateMandatoryRequirementsSection } from "@/features/templates/template-mandatory-requirements-section";
import { TemplateQuestionsSection } from "@/features/templates/template-questions-section";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

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
  const jobAnalysis = template.jobDescriptionId ? await getLatestJobAnalysis(template.jobDescriptionId) : null;

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

  return (
    <>
      <AppTopbar title={template.name} locale={locale} />
      <PageContainer width="wide">
        <TemplateHeaderSection
          name={template.name}
          interviewLanguage={template.interviewLanguage as InterviewLanguage}
          version={template.version}
          status={template.status}
          stageLabel={stageConfig.label}
          positionId={position?.id ?? null}
          positionTitle={position?.title ?? null}
          isArchived={isArchived}
          editable={editable}
          editableNote={
            !editable
              ? template.status === "approved"
                ? t(locale, "templates.editableNotePublished")
                : t(locale, "templates.editableNoteLocked")
              : null
          }
          canDelete={deleteCheck}
          cannotDeleteNote={!deleteCheck}
          publishAction={publishTemplateAction.bind(null, template.id)}
          createNewVersionAction={createNewVersionAction.bind(null, template.id)}
          restoreAction={restoreTemplateAction.bind(null, template.id)}
          archiveAction={archiveTemplateAction.bind(null, template.id)}
          deleteAction={deleteTemplateAction.bind(null, template.id)}
          locale={locale}
        />

        <TemplateJobDescriptionSection
          positionId={template.positionId}
          editable={editable}
          jobDescription={jobDescription ?? null}
          jobAnalysis={jobAnalysis ?? null}
          positionRoleFamily={position?.roleFamily ?? null}
          positionSeniority={position?.seniority ?? null}
          analyzeJobDescriptionAction={analyzeJobDescriptionAction.bind(null, template.id)}
          locale={locale}
        />

        <TemplateConfigSection
          editable={editable}
          stage={stage}
          defaultValues={{
            passThreshold: template.passThreshold,
            borderlineMin: template.borderlineMin,
            criticalMin: template.criticalMin,
            minCompletion: template.minCompletion,
            englishRequired: template.englishRequired,
            englishMinLevel: template.englishMinLevel,
            includeCompensationQuestion: template.includeCompensationQuestion,
            includeWorkAuthorizationCheck: template.includeWorkAuthorizationCheck,
            includeCodeExercises: template.includeCodeExercises,
          }}
          updateScoringConfigAction={updateScoringConfigAction.bind(null, template.id)}
          locale={locale}
        />

        <TemplateCompetenciesSection
          templateId={id}
          editable={editable}
          stage={stage}
          includeCodeExercises={template.includeCodeExercises}
          competencies={competencies}
          weightSum={weightSum}
          hasJobAnalysis={Boolean(jobAnalysis)}
          generateTemplateDraftAction={generateTemplateDraftAction.bind(null, template.id)}
          moveCompetencyAction={moveCompetencyAction}
          deleteCompetencyAction={deleteCompetencyAction}
          locale={locale}
        />

        <TemplateMandatoryRequirementsSection
          templateId={id}
          editable={editable}
          mandatoryRequirements={mandatoryRequirements}
          moveMandatoryRequirementAction={moveMandatoryRequirementAction}
          deleteMandatoryRequirementAction={deleteMandatoryRequirementAction}
          locale={locale}
        />

        <TemplateQuestionsSection
          templateId={id}
          editable={editable}
          competencies={competencies}
          questionsByCompetency={questionsByCompetency}
          blueprints={blueprints ?? []}
          moveQuestionAction={moveQuestionAction}
          deleteQuestionAction={deleteQuestionAction}
          regenerateQuestionAction={regenerateQuestionAction}
          locale={locale}
        />
      </PageContainer>
    </>
  );
}
