import { cookies } from "next/headers";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPositionAction } from "@/features/positions/actions";
import { PositionForm } from "@/features/positions/position-form";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export default async function NewPositionPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  return (
    <>
      <AppTopbar title={t(locale, "positions.newPositionPageTitle")} locale={locale} />
      <PageContainer width="standard">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">{t(locale, "positions.createPositionHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PositionForm
              action={createPositionAction}
              submitLabel={t(locale, "positions.createPositionSubmitLabel")}
              locale={locale}
            />
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
