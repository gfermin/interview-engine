import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { updateQuestionAction } from "@/features/templates/actions";
import { getQuestion, getTemplate, listCompetencies } from "@/features/templates/queries";
import { QuestionForm } from "@/features/templates/question-form";

export const dynamic = "force-dynamic";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string; qId: string }>;
}) {
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
      <AppTopbar title="Edit Question" />
      <main className="mx-auto flex w-full max-w-[820px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Edit Question</CardTitle>
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
                submitLabel="Save Changes"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This template version is no longer editable.{" "}
                <Link href={`/templates/${id}`} className="underline">
                  Back to template
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
