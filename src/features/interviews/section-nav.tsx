import { AlertTriangle, Check, Circle, CircleDot } from "lucide-react";
import type { SectionStatus } from "@/domain/interviews/section-status";

// Ported from the artifact's statusIconFor() (○/●/✓/⚠ — plan §37/Phase 8),
// swapped for lucide equivalents to match the rest of the app's iconography.
const SECTION_ICON: Record<SectionStatus, typeof Circle> = {
  not_started: Circle,
  in_progress: CircleDot,
  complete: Check,
  critical_concern: AlertTriangle,
};

const SECTION_ICON_CLASS: Record<SectionStatus, string> = {
  not_started: "text-muted-foreground",
  in_progress: "text-primary",
  complete: "text-emerald-600 dark:text-emerald-400",
  critical_concern: "text-destructive",
};

/**
 * In-page section navigation via hash anchors rather than client-side tab
 * state — every competency's questions render on the page at once (like the
 * Template builder's Questions card), so "navigating" a section just means
 * scrolling to it. This keeps the live interview screen server-rendered and
 * progressively enhanced, consistent with the rest of the app.
 */
export function SectionNav({
  sections,
}: {
  sections: { id: string; name: string; status: SectionStatus }[];
}) {
  return (
    <nav className="flex flex-wrap gap-1.5">
      {sections.map((section) => {
        const Icon = SECTION_ICON[section.status];
        return (
          <a
            key={section.id}
            href={`#comp-${section.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[12px] hover:bg-muted"
          >
            <Icon className={`size-3.5 shrink-0 ${SECTION_ICON_CLASS[section.status]}`} />
            {section.name}
          </a>
        );
      })}
    </nav>
  );
}
