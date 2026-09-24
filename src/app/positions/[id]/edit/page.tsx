import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePositionAction } from "@/features/positions/actions";
import { PositionForm } from "@/features/positions/position-form";
import { getPosition } from "@/features/positions/queries";

export const dynamic = "force-dynamic";

export default async function EditPositionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const position = await getPosition(id);
  if (!position) notFound();

  const boundUpdatePosition = updatePositionAction.bind(null, id);

  return (
    <>
      <AppTopbar title={`Edit ${position.title}`} />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Edit Position</CardTitle>
          </CardHeader>
          <CardContent>
            <PositionForm
              action={boundUpdatePosition}
              defaultValues={position}
              submitLabel="Save Changes"
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
