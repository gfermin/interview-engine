import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { createQuestionAction } from "@/features/templates/actions";
import { listCompetencies, getTemplate } from "@/features/templates/queries";
import { QuestionForm } from "@/features/templates/question-form";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ competencyId?: string }>;
}) {
  const { id } = await params;
  const { competencyId } = await searchParams;
  const [template, competencies] = await Promise.all([getTemplate(id), listCompetencies(id)]);
  if (!template) notFound();

  const showCodeFields = getStageConfig(template.stage as InterviewStage).modules.codeExercises;

  return (
    <>
      <AppTopbar title="Add Question" />
      <main className="mx-auto flex w-full max-w-[820px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Add Question</CardTitle>
          </CardHeader>
          <CardContent>
            {!isTemplateEditable(template) ? (
              <p className="text-sm text-muted-foreground">
                This template version is no longer editable.{" "}
                <Link href={`/templates/${id}`} className="underline">
                  Back to template
                </Link>
              </p>
            ) : competencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add a{" "}
                <Link href={`/templates/${id}/competencies/new`} className="underline">
                  competency
                </Link>{" "}
                before adding questions.
              </p>
            ) : (
              <QuestionForm
                action={createQuestionAction.bind(null, id)}
                competencies={competencies}
                showCodeFields={showCodeFields}
                defaultValues={competencyId ? { competencyId } : undefined}
                submitLabel="Add Question"
              />
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
