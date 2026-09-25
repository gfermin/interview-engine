import { cookies } from "next/headers";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCandidateAction } from "@/features/candidates/actions";
import { CandidateForm } from "@/features/candidates/candidate-form";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export default async function NewCandidatePage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  return (
    <>
      <AppTopbar title={t(locale, "candidates.newCandidatePageTitle")} locale={locale} />
      <PageContainer width="standard">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">{t(locale, "candidates.addCandidateHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateForm
              action={createCandidateAction}
              submitLabel={t(locale, "candidates.addCandidateSubmitLabel")}
              locale={locale}
            />
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
