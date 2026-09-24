import Link from "next/link";
import { AppTopbar } from "@/components/layout/app-topbar";
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
import { listCandidates } from "@/features/candidates/queries";

// See src/app/positions/page.tsx for why this is forced dynamic — otherwise
// Next.js prerenders the list at build time and newly added candidates
// never show up.
export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const candidates = await listCandidates();

  return (
    <>
      <AppTopbar title="Candidates" />
      <main className="mx-auto flex w-full max-w-[980px] flex-1 flex-col gap-5 px-6 py-7">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            A candidate can have many Interview Sessions — different stages,
            or a re-interview (plan §23).
          </p>
          <Button render={<Link href="/candidates/new">New Candidate</Link>} />
        </div>

        <Card>
          <CardContent className="p-0">
            {candidates.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No candidates yet.{" "}
                <Link href="/candidates/new" className="underline">
                  Add the first one
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <Link
                          href={`/candidates/${candidate.id}`}
                          className="font-medium hover:underline"
                        >
                          {candidate.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {candidate.email ?? "—"}
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
