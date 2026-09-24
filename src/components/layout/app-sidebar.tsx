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

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/positions", label: "Positions", icon: Briefcase },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/interviews", label: "Interviews", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-4 border-r border-border bg-card px-3 py-4">
      <div className="px-2 pt-1 pb-1">
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 shrink-0 rotate-45 rounded-[2px] bg-primary" />
          <h1 className="text-[15px] font-bold tracking-tight">
            Interview Platform
          </h1>
        </div>
        <p className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Universal Assessment Engine
        </p>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-border px-2.5 pt-3">
        <p className="text-[10.5px] leading-snug text-muted-foreground/80">
          Local POC build — Phase 5.5 (AI Generation, Claude or Gemini free
          tier). Positions and Templates are live, with AI-assisted JD
          analysis and draft generation; Candidates/Interviews/Reports are
          scaffolded and filled in over later phases.
        </p>
      </div>
    </aside>
  );
}
