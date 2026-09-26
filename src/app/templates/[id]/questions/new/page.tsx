import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { createQuestionAction } from "@/features/templates/actions";
import { listCompetencies, getTemplate } from "@/features/templates/queries";
import { QuestionForm } from "@/features/templates/question-form";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ competencyId?: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const { id } = await params;
  const { competencyId } = await searchParams;
  const [template, competencies] = await Promise.all([getTemplate(id), listCompetencies(id)]);
  if (!template) notFound();

  const showCodeFields = getStageConfig(template.stage as InterviewStage).modules.codeExercises;

  return (
    <>
      <AppTopbar title={t(locale, "templates.addQuestionTitle")} locale={locale} />
      <PageContainer width="wide">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">{t(locale, "templates.addQuestionTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!isTemplateEditable(template) ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, "templates.notEditableMessage")}
                <Link href={`/templates/${id}`} className="underline">
                  {t(locale, "templates.backToTemplateLink")}
                </Link>
              </p>
            ) : competencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, "templates.addCompetencyBeforeQuestionsPrefix")}
                <Link href={`/templates/${id}/competencies/new`} className="underline">
                  {t(locale, "templates.competencyLinkText")}
                </Link>
                {t(locale, "templates.addCompetencyBeforeQuestionsSuffix")}
              </p>
            ) : (
              <QuestionForm
                action={createQuestionAction.bind(null, id)}
                competencies={competencies}
                showCodeFields={showCodeFields}
                defaultValues={competencyId ? { competencyId } : undefined}
                submitLabel={t(locale, "templates.addQuestionTitle")}
                locale={locale}
              />
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
