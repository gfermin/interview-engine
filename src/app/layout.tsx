import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { resolveTheme, THEME_COOKIE } from "@/features/settings/theme";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Interview Platform",
  description: "Universal, JD-driven interview assessment platform.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get(THEME_COOKIE)?.value);
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  return (
    <html
      lang={locale}
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
    >
      <body className="flex min-h-full">
        <AppSidebar locale={locale} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
