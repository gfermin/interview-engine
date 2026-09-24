import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCandidateAction } from "@/features/candidates/actions";
import { CandidateForm } from "@/features/candidates/candidate-form";

export default function NewCandidatePage() {
  return (
    <>
      <AppTopbar title="New Candidate" />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Add Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateForm action={createCandidateAction} submitLabel="Add Candidate" />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
