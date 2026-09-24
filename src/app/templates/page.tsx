import Link from "next/link";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import { listTemplates } from "@/features/templates/queries";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  draft: "outline",
  approved: "secondary",
  locked: "default",
} as const;

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <>
      <AppTopbar title="Templates" />
      <main className="mx-auto flex w-full max-w-[980px] flex-1 flex-col gap-5 px-6 py-7">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            Versioned, publishable interview definitions — one per
            Position + Stage (plan §22, ADR-008).
          </p>
          <Button render={<Link href="/templates/new">New Template</Link>} />
        </div>

        <Card>
          <CardContent className="p-0">
            {templates.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No templates yet.{" "}
                <Link href="/templates/new" className="underline">
                  Create the first one
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Link
                          href={`/templates/${template.id}`}
                          className="font-medium hover:underline"
                        >
                          {template.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {template.positionTitle}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {STAGE_LABELS[template.stage as InterviewStage]}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        v{template.version}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[template.status]} className="capitalize">
                          {template.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
