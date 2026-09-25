import { cookies } from "next/headers";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setLocaleAction, setThemeAction } from "@/features/settings/actions";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { resolveTheme, THEME_COOKIE } from "@/features/settings/theme";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  return (
    <>
      <AppTopbar title={t(locale, "settings.title")} locale={locale} />
      <PageContainer width="standard">
        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "settings.appearanceTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-[12.5px] text-muted-foreground">
              {t(locale, "settings.appearanceDescription")}
            </p>
            <div className="flex gap-2">
              <form action={setThemeAction.bind(null, "dark")}>
                <Button type="submit" variant={theme === "dark" ? "default" : "outline"}>
                  {t(locale, "settings.themeDark")}
                </Button>
              </form>
              <form action={setThemeAction.bind(null, "light")}>
                <Button type="submit" variant={theme === "light" ? "default" : "outline"}>
                  {t(locale, "settings.themeLight")}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "settings.languageTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-[12.5px] text-muted-foreground">
              {t(locale, "settings.languageDescription")}
            </p>
            <div className="flex gap-2">
              <form action={setLocaleAction.bind(null, "en")}>
                <Button type="submit" variant={locale === "en" ? "default" : "outline"}>
                  {t(locale, "common.languageEnglish")}
                </Button>
              </form>
              <form action={setLocaleAction.bind(null, "es")}>
                <Button type="submit" variant={locale === "es" ? "default" : "outline"}>
                  {t(locale, "common.languageSpanish")}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
