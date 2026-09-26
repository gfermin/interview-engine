import { cookies } from "next/headers";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTemplateAction } from "@/features/templates/actions";
import { TemplateForm } from "@/features/templates/template-form";
import { listPositions } from "@/features/positions/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ positionId?: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const [positions, { positionId }] = await Promise.all([listPositions(), searchParams]);

  return (
    <>
      <AppTopbar title={t(locale, "templates.newTemplateButton")} locale={locale} />
      <PageContainer width="standard">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">{t(locale, "templates.createDraftTemplateTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, "templates.noPositionsMessage")}
              </p>
            ) : (
              <TemplateForm
                action={createTemplateAction}
                positions={positions}
                defaultPositionId={positionId}
                locale={locale}
              />
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
