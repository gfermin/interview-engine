import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { updateCompetencyAction } from "@/features/templates/actions";
import { CompetencyForm } from "@/features/templates/competency-form";
import { getCompetency, getTemplate } from "@/features/templates/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function EditCompetencyPage({
  params,
}: {
  params: Promise<{ id: string; compId: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const { id, compId } = await params;
  const [template, competency] = await Promise.all([
    getTemplate(id),
    getCompetency(compId),
  ]);
  if (!template || !competency || competency.templateId !== id) notFound();

  return (
    <>
      <AppTopbar title={t(locale, "templates.editCompetencyTitle")} locale={locale} />
      <PageContainer width="standard">
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">{t(locale, "templates.editCompetencyTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isTemplateEditable(template) ? (
              <CompetencyForm
                action={updateCompetencyAction.bind(null, id, compId)}
                defaultValues={{
                  name: competency.name,
                  weight: competency.weight,
                  critical: competency.critical,
                  expectedDepth: competency.expectedDepth,
                }}
                submitLabel={t(locale, "templates.saveChangesButton")}
                locale={locale}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(locale, "templates.notEditableMessage")}
                <Link href={`/templates/${id}`} className="underline">
                  {t(locale, "templates.backToTemplateLink")}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
