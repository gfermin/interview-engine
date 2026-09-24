import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { createCompetencyAction } from "@/features/templates/actions";
import { CompetencyForm } from "@/features/templates/competency-form";
import { getTemplate } from "@/features/templates/queries";

export const dynamic = "force-dynamic";

export default async function NewCompetencyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  return (
    <>
      <AppTopbar title="Add Competency" />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Add Competency</CardTitle>
          </CardHeader>
          <CardContent>
            {isTemplateEditable(template) ? (
              <CompetencyForm
                action={createCompetencyAction.bind(null, id)}
                submitLabel="Add Competency"
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
