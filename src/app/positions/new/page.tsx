import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPositionAction } from "@/features/positions/actions";
import { PositionForm } from "@/features/positions/position-form";

export default function NewPositionPage() {
  return (
    <>
      <AppTopbar title="New Position" />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Create Position</CardTitle>
          </CardHeader>
          <CardContent>
            <PositionForm action={createPositionAction} submitLabel="Create Position" />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
