import { cookies } from "next/headers";
import Link from "next/link";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/ui/button";
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
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

// See src/app/positions/page.tsx for why this is forced dynamic — otherwise
// Next.js prerenders the list at build time and newly added candidates
// never show up.
export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const candidates = await listCandidates();

  return (
    <>
      <AppTopbar title={t(locale, "candidates.pageTitle")} locale={locale} />
      <PageContainer width="wide">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            {t(locale, "candidates.pageDescription")}
          </p>
          <ButtonLink href="/candidates/new">{t(locale, "candidates.newCandidateButton")}</ButtonLink>
        </div>

        <Card>
          <CardContent className="p-0">
            {candidates.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                {t(locale, "candidates.emptyPrefix")}
                <Link href="/candidates/new" className="underline">
                  {t(locale, "candidates.emptyLinkText")}
                </Link>
                {t(locale, "candidates.emptySuffix")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "candidates.tableName")}</TableHead>
                    <TableHead>{t(locale, "candidates.tableEmail")}</TableHead>
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
      </PageContainer>
    </>
  );
}
