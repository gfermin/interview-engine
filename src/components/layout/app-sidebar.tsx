import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  ClipboardList,
  FileBarChart,
  Settings,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/", key: "navigation.dashboard", icon: LayoutDashboard },
  { href: "/positions", key: "navigation.positions", icon: Briefcase },
  { href: "/templates", key: "navigation.templates", icon: FileText },
  { href: "/candidates", key: "navigation.candidates", icon: Users },
  { href: "/interviews", key: "navigation.interviews", icon: ClipboardList },
  { href: "/reports", key: "navigation.reports", icon: FileBarChart },
  { href: "/settings", key: "navigation.settings", icon: Settings },
] as const;

export function AppSidebar({ locale }: { locale: Locale }) {
  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-4 border-r border-border bg-card px-3 py-4">
      <div className="px-2 pt-1 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 shrink-0 rotate-45 rounded-[2px] bg-primary" />
          <h1 className="text-[15px] font-bold tracking-tight">{t(locale, "common.appName")}</h1>
        </div>
        <p className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t(locale, "common.appTagline")}
        </p>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Icon className="size-4 shrink-0" />
            <span>{t(locale, key)}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-border px-2.5 pt-3">
        <p className="text-[10.5px] leading-snug text-muted-foreground/80">
          Local POC build — core loop complete (Phases 1-11), now in Phase
          13 (Hardening/Testing/UX Polish). A full-codebase audit (plan
          §40) drove this pass: display-only fixes (friendly status labels,
          a fixed duplicate-text dropdown, a clearer empty state) shipped
          immediately, while confirmed bugs, error-message cleanup, and
          test-coverage gaps are tracked as a reviewed backlog for a
          follow-up pass rather than fixed ad hoc.
        </p>
      </div>
    </aside>
  );
}
