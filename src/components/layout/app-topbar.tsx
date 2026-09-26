import { Badge } from "@/components/ui/badge";
import { t, type Locale } from "@/lib/i18n";

// `locale` is optional and defaults to English (plan Phase 20/§42) — most
// callers don't pass it yet (bulk migration is Phase 21 Task 21.4); the
// pages that do (Dashboard, Settings) get the "POC" badge translated too.
export function AppTopbar({ title, locale = "en" }: { title: string; locale?: Locale }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-6 py-3 shadow-sm">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <Badge variant="secondary" className="font-mono text-[10.5px] uppercase">
        {t(locale, "common.pocBadge")}
      </Badge>
    </header>
  );
}
