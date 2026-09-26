import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { LifecycleActionButton } from "@/components/lifecycle-action-button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canDeletePosition } from "@/domain/positions/lifecycle";
import {
  archivePositionAction,
  deletePositionAction,
  restorePositionAction,
  saveJobDescriptionAction,
} from "@/features/positions/actions";
import { JobDescriptionEditor } from "@/features/positions/job-description-editor";
import {
  countUsedTemplatesForPosition,
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

  const [activeJobDescription, versions, usedTemplateCount] = await Promise.all([
    getActiveJobDescription(id),
    listJobDescriptionVersions(id),
    countUsedTemplatesForPosition(id),
  ]);

  const boundSaveJobDescription = saveJobDescriptionAction.bind(null, id);
  const isArchived = Boolean(position.archivedAt);
  const deleteCheck = canDeletePosition(usedTemplateCount);

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
                {isArchived ? (
                  <Badge variant="outline">{t(locale, "positions.archivedBadge")}</Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-2">
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
              {isArchived ? (
                <LifecycleActionButton
                  action={restorePositionAction.bind(null, position.id)}
                  label={t(locale, "positions.restoreButton")}
                  icon={<ArchiveRestore />}
                />
              ) : (
                <>
                  <LifecycleActionButton
                    action={archivePositionAction.bind(null, position.id)}
                    label={t(locale, "positions.archiveButton")}
                    icon={<Archive />}
                    confirmMessage={t(locale, "positions.archiveConfirm")}
                  />
                  {deleteCheck.allowed ? (
                    <LifecycleActionButton
                      action={deletePositionAction.bind(null, position.id)}
                      label={t(locale, "positions.deleteButton")}
                      icon={<Trash2 />}
                      variant="destructive"
                      confirmMessage={`${t(locale, "positions.deleteConfirmPrefix")}${position.title}${t(locale, "positions.deleteConfirmSuffix")}`}
                    />
                  ) : null}
                </>
              )}
            </div>
          </CardHeader>
          {!isArchived && !deleteCheck.allowed ? (
            <CardContent className="pt-0">
              <p className="text-[11.5px] text-muted-foreground">
                {t(locale, "positions.cannotDeletePrefix")}
                {usedTemplateCount}
                {t(
                  locale,
                  usedTemplateCount === 1
                    ? "positions.cannotDeleteTemplateSingular"
                    : "positions.cannotDeleteTemplatePlural"
                )}
              </p>
            </CardContent>
          ) : null}
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
