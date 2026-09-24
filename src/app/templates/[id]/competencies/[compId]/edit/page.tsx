import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { updateCompetencyAction } from "@/features/templates/actions";
import { CompetencyForm } from "@/features/templates/competency-form";
import { getCompetency, getTemplate } from "@/features/templates/queries";

export const dynamic = "force-dynamic";

export default async function EditCompetencyPage({
  params,
}: {
  params: Promise<{ id: string; compId: string }>;
}) {
  const { id, compId } = await params;
  const [template, competency] = await Promise.all([
    getTemplate(id),
    getCompetency(compId),
  ]);
  if (!template || !competency || competency.templateId !== id) notFound();

  return (
    <>
      <AppTopbar title="Edit Competency" />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Edit Competency</CardTitle>
          </CardHeader>
          <CardContent>
            {isTemplateEditable(template) ? (
              <CompetencyForm
                action={updateCompetencyAction.bind(null, id, compId)}
                defaultValues={{
                  name: competency.name,
                  weight: competency.weight,
                  critical: competency.critical,
                  expectedDepth: competency.expectedDepth,
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
