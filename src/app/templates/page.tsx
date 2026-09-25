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
import { STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import { listTemplates } from "@/features/templates/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  draft: "outline",
  approved: "secondary",
  locked: "default",
} as const;

export default async function TemplatesPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const templates = await listTemplates();

  return (
    <>
      <AppTopbar title={t(locale, "templates.listPageTitle")} locale={locale} />
      <PageContainer width="wide">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            {t(locale, "templates.listDescription")}
          </p>
          <ButtonLink href="/templates/new">{t(locale, "templates.newTemplateButton")}</ButtonLink>
        </div>

        <Card>
          <CardContent className="p-0">
            {templates.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                {t(locale, "templates.noTemplatesMessage")}{" "}
                <Link href="/templates/new" className="underline">
                  {t(locale, "templates.createFirstLink")}
                </Link>
                {t(locale, "templates.noTemplatesSuffix")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "templates.tableName")}</TableHead>
                    <TableHead>{t(locale, "templates.positionLabel")}</TableHead>
                    <TableHead>{t(locale, "templates.tableStage")}</TableHead>
                    <TableHead>{t(locale, "templates.tableVersion")}</TableHead>
                    <TableHead>{t(locale, "templates.tableStatus")}</TableHead>
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
      </PageContainer>
    </>
  );
}
