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
import { listPositions } from "@/features/positions/queries";

// Without this, Next.js has no signal that this Server Component reads live
// data (the DB call isn't one of Next's own "dynamic APIs") and will
// prerender the list statically at build time — freezing it. Force dynamic
// rendering so newly created Positions actually show up.
export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  const positions = await listPositions();

  return (
    <>
      <AppTopbar title="Positions" />
      <main className="mx-auto flex w-full max-w-[980px] flex-1 flex-col gap-5 px-6 py-7">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            A role, its Role Family, Seniority, and Job Description — the
            inputs interview generation is calibrated against (plan §39).
          </p>
          <Button render={<Link href="/positions/new">New Position</Link>} />
        </div>

        <Card>
          <CardContent className="p-0">
            {positions.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No positions yet.{" "}
                <Link href="/positions/new" className="underline">
                  Create the first one
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Role family</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell>
                        <Link
                          href={`/positions/${position.id}`}
                          className="font-medium hover:underline"
                        >
                          {position.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {position.roleFamily ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {position.seniority ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {position.status}
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
