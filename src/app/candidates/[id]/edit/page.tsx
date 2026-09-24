import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateCandidateAction } from "@/features/candidates/actions";
import { CandidateForm } from "@/features/candidates/candidate-form";
import { getCandidate } from "@/features/candidates/queries";

export const dynamic = "force-dynamic";

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) notFound();

  const boundUpdateCandidate = updateCandidateAction.bind(null, id);

  return (
    <>
      <AppTopbar title={`Edit ${candidate.name}`} />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Edit Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateForm
              action={boundUpdateCandidate}
              defaultValues={candidate}
              submitLabel="Save Changes"
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
