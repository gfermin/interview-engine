import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveJobDescriptionAction } from "@/features/positions/actions";
import { JobDescriptionEditor } from "@/features/positions/job-description-editor";
import {
  getActiveJobDescription,
  getPosition,
  listJobDescriptionVersions,
} from "@/features/positions/queries";

export const dynamic = "force-dynamic";

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const position = await getPosition(id);
  if (!position) notFound();

  const [activeJobDescription, versions] = await Promise.all([
    getActiveJobDescription(id),
    listJobDescriptionVersions(id),
  ]);

  const boundSaveJobDescription = saveJobDescriptionAction.bind(null, id);

  return (
    <>
      <AppTopbar title={position.title} />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-[15px]">{position.title}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {position.roleFamily ?? "Role family: —"}
                </Badge>
                <Badge variant="secondary">
                  {position.seniority ?? "Seniority: —"}
                </Badge>
                {position.department ? (
                  <Badge variant="outline">{position.department}</Badge>
                ) : null}
                <Badge className="capitalize">{position.status}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/templates/new?positionId=${position.id}`}>New Template</Link>}
              />
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/positions/${position.id}/edit`}>Edit</Link>}
              />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Job Description</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <JobDescriptionEditor
              action={boundSaveJobDescription}
              defaultText={activeJobDescription?.rawText}
              version={activeJobDescription?.version}
            />
            {versions.length > 1 ? (
              <p className="text-[11px] text-muted-foreground">
                {versions.length} versions on file — earlier versions are kept
                for history once a template has referenced them (plan §39.8).
              </p>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
