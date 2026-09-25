import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveJobDescriptionAction } from "@/features/positions/actions";
import { JobDescriptionEditor } from "@/features/positions/job-description-editor";
import {
  getActiveJobDescription,
  getPosition,
  listJobDescriptionVersions,
} from "@/features/positions/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

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
      <AppTopbar title={position.title} locale={locale} />
      <PageContainer width="wide">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-[15px]">{position.title}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary">
                  {position.roleFamily ?? t(locale, "positions.roleFamilyFallback")}
                </Badge>
                <Badge variant="secondary">
                  {position.seniority ?? t(locale, "positions.seniorityFallback")}
                </Badge>
                {position.department ? (
                  <Badge variant="outline">{position.department}</Badge>
                ) : null}
                <Badge className="capitalize">{position.status}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <ButtonLink
                variant="outline"
                size="sm"
                href={`/templates/new?positionId=${position.id}`}
              >
                {t(locale, "positions.newTemplateButton")}
              </ButtonLink>
              <ButtonLink variant="outline" size="sm" href={`/positions/${position.id}/edit`}>
                {t(locale, "positions.editButton")}
              </ButtonLink>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "positions.jobDescriptionHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <JobDescriptionEditor
              action={boundSaveJobDescription}
              defaultText={activeJobDescription?.rawText}
              version={activeJobDescription?.version}
              locale={locale}
            />
            {versions.length > 1 ? (
              <p className="text-[11px] text-muted-foreground">
                {versions.length}
                {t(locale, "positions.versionsOnFileSuffix")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
