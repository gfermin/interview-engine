import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { updateQuestionAction } from "@/features/templates/actions";
import { getQuestion, getTemplate, listCompetencies } from "@/features/templates/queries";
import { QuestionForm } from "@/features/templates/question-form";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string; qId: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const { id, qId } = await params;
  const [template, question, competencies] = await Promise.all([
    getTemplate(id),
    getQuestion(qId),
    listCompetencies(id),
  ]);
  if (!template || !question || question.templateId !== id) notFound();

  const showCodeFields = getStageConfig(template.stage as InterviewStage).modules.codeExercises;

  return (
    <>
      <AppTopbar title={t(locale, "templates.editQuestionTitle")} locale={locale} />
      <PageContainer width="wide">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">{t(locale, "templates.editQuestionTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isTemplateEditable(template) ? (
              <QuestionForm
                action={updateQuestionAction.bind(null, id, qId)}
                competencies={competencies}
                showCodeFields={showCodeFields}
                defaultValues={{
                  competencyId: question.competencyId,
                  text: question.text,
                  difficulty: question.difficulty,
                  importance: question.importance,
                  expected: question.expected,
                  strong: question.strong,
                  acceptable: question.acceptable,
                  concepts: question.concepts,
                  redFlags: question.redFlags,
                  followUps: question.followUps,
                  rubric: question.rubric,
                  code: question.code,
                  solution: question.solution,
                  jdRequirementTag: question.jdRequirementTag,
                  altSolutions: question.altSolutions,
                }}
                submitLabel={t(locale, "templates.saveChangesButton")}
                locale={locale}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(locale, "templates.notEditableMessage")}
                <Link href={`/templates/${id}`} className="underline">
                  {t(locale, "templates.backToTemplateLink")}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
