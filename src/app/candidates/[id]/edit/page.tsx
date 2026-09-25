import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateCandidateAction } from "@/features/candidates/actions";
import { CandidateForm } from "@/features/candidates/candidate-form";
import { getCandidate } from "@/features/candidates/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) notFound();

  const boundUpdateCandidate = updateCandidateAction.bind(null, id);

  return (
    <>
      <AppTopbar title={`${t(locale, "candidates.editPrefix")}${candidate.name}`} locale={locale} />
      <PageContainer width="standard">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">{t(locale, "candidates.editCandidateHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateForm
              action={boundUpdateCandidate}
              defaultValues={candidate}
              submitLabel={t(locale, "candidates.saveChangesButton")}
              locale={locale}
            />
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
