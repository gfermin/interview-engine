import { cookies } from "next/headers";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setThemeAction } from "@/features/settings/actions";
import { resolveTheme, THEME_COOKIE } from "@/features/settings/theme";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <>
      <AppTopbar title="Settings" />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-[12.5px] text-muted-foreground">
              Defaults to dark, matching the &quot;Calibraci&oacute;n QA&quot; reference artifact&apos;s
              own dark palette. Switch to light any time — the choice is remembered on this
              device.
            </p>
            <div className="flex gap-2">
              <form action={setThemeAction.bind(null, "dark")}>
                <Button type="submit" variant={theme === "dark" ? "default" : "outline"}>
                  Dark
                </Button>
              </form>
              <form action={setThemeAction.bind(null, "light")}>
                <Button type="submit" variant={theme === "light" ? "default" : "outline"}>
                  Light
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
