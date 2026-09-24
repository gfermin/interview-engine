import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { updateMandatoryRequirementAction } from "@/features/templates/actions";
import { MandatoryRequirementForm } from "@/features/templates/mandatory-requirement-form";
import { getMandatoryRequirement, getTemplate } from "@/features/templates/queries";

export const dynamic = "force-dynamic";

export default async function EditMandatoryRequirementPage({
  params,
}: {
  params: Promise<{ id: string; reqId: string }>;
}) {
  const { id, reqId } = await params;
  const [template, requirement] = await Promise.all([
    getTemplate(id),
    getMandatoryRequirement(reqId),
  ]);
  if (!template || !requirement || requirement.templateId !== id) notFound();

  return (
    <>
      <AppTopbar title="Edit Mandatory Requirement" />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Edit Mandatory Requirement</CardTitle>
          </CardHeader>
          <CardContent>
            {isTemplateEditable(template) ? (
              <MandatoryRequirementForm
                action={updateMandatoryRequirementAction.bind(null, id, reqId)}
                defaultValues={{
                  label: requirement.label,
                  description: requirement.description,
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
