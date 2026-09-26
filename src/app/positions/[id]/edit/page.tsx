import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePositionAction } from "@/features/positions/actions";
import { PositionForm } from "@/features/positions/position-form";
import { getPosition } from "@/features/positions/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EditPositionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const { id } = await params;
  const position = await getPosition(id);
  if (!position) notFound();

  const boundUpdatePosition = updatePositionAction.bind(null, id);

  return (
    <>
      <AppTopbar title={`${t(locale, "positions.editPrefix")}${position.title}`} locale={locale} />
      <PageContainer width="standard">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">{t(locale, "positions.editPositionHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PositionForm
              action={boundUpdatePosition}
              defaultValues={position}
              submitLabel={t(locale, "positions.saveChangesButton")}
              locale={locale}
            />
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
