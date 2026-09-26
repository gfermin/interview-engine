import { cookies } from "next/headers";
import Link from "next/link";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCandidates, type CandidateListFilters } from "@/features/candidates/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

// See src/app/positions/page.tsx for why this is forced dynamic — otherwise
// Next.js prerenders the list at build time and newly added candidates
// never show up.
export const dynamic = "force-dynamic";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const { archived: archivedParam } = await searchParams;
  const archived = (archivedParam as CandidateListFilters["archived"]) ?? "active";

  const candidates = await listCandidates({ archived });

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
          <CardContent className="pt-5">
            <form className="flex flex-wrap items-end gap-3" method="get">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="archived">
                  {t(locale, "candidates.statusFilterLabel")}
                </label>
                <Select id="archived" name="archived" defaultValue={archived} className="w-40">
                  <option value="active">{t(locale, "candidates.filterActiveOption")}</option>
                  <option value="archived">{t(locale, "candidates.filterArchivedOption")}</option>
                  <option value="all">{t(locale, "candidates.filterAllOption")}</option>
                </Select>
              </div>
              <Button type="submit" size="sm">
                {t(locale, "candidates.filterButton")}
              </Button>
              {archived !== "active" ? (
                <ButtonLink size="sm" variant="outline" href="/candidates">
                  {t(locale, "candidates.clearFilterButton")}
                </ButtonLink>
              ) : null}
            </form>
          </CardContent>
        </Card>

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
                    <TableHead />
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
                      <TableCell>
                        {candidate.archivedAt ? (
                          <Badge variant="outline">{t(locale, "candidates.archivedBadge")}</Badge>
                        ) : null}
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
