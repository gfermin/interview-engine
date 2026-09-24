import { AppTopbar } from "@/components/layout/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTemplateAction } from "@/features/templates/actions";
import { TemplateForm } from "@/features/templates/template-form";
import { listPositions } from "@/features/positions/queries";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ positionId?: string }>;
}) {
  const [positions, { positionId }] = await Promise.all([listPositions(), searchParams]);

  return (
    <>
      <AppTopbar title="New Template" />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Create Draft Template</CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a Position first — a template belongs to a Position +
                Interview Stage.
              </p>
            ) : (
              <TemplateForm
                action={createTemplateAction}
                positions={positions}
                defaultPositionId={positionId}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
