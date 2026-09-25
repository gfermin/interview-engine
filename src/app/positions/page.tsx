import { cookies } from "next/headers";
import Link from "next/link";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
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
import { listPositions } from "@/features/positions/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

// Without this, Next.js has no signal that this Server Component reads live
// data (the DB call isn't one of Next's own "dynamic APIs") and will
// prerender the list statically at build time — freezing it. Force dynamic
// rendering so newly created Positions actually show up.
export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const positions = await listPositions();

  return (
    <>
      <AppTopbar title={t(locale, "positions.pageTitle")} locale={locale} />
      <PageContainer width="wide">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            {t(locale, "positions.pageDescription")}
          </p>
          <ButtonLink href="/positions/new">{t(locale, "positions.newPositionButton")}</ButtonLink>
        </div>

        <Card>
          <CardContent className="p-0">
            {positions.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                {t(locale, "positions.emptyPrefix")}
                <Link href="/positions/new" className="underline">
                  {t(locale, "positions.emptyLinkText")}
                </Link>
                {t(locale, "positions.emptySuffix")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "positions.tableTitle")}</TableHead>
                    <TableHead>{t(locale, "positions.tableRoleFamily")}</TableHead>
                    <TableHead>{t(locale, "positions.tableSeniority")}</TableHead>
                    <TableHead>{t(locale, "positions.tableStatus")}</TableHead>
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
      </PageContainer>
    </>
  );
}
