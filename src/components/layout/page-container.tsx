import type { ReactNode } from "react";
import { cn } from "cn";

// Plan Phase 19/§42: the app's content had no shared width system — every
// page independently hardcoded its own `<main className="mx-auto max-w-
// [Npx]">` literal (640-980px across ~23 pages), which is why the app read
// as narrow/compressed next to "Calibración QA" even though the flex shell
// (AppSidebar + flex-1) already claims full remaining viewport width
// correctly. This is the one place that width now lives.
//
// Three variants, not a continuum — the screenshot the width audit used as
// its visual reference shows a single-column layout with no side panel
// (correcting an earlier assumption in this plan's own §16), so "full"
// means "use nearly all of the sidebar's remaining space," not literally
// 100% (§16: sensible constraints, not `width: 100%` everywhere).
export type PageContainerWidth = "standard" | "wide" | "full";

const WIDTH_CLASSES: Record<PageContainerWidth, string> = {
  // Simple forms (a handful of fields) — candidates/positions/templates
  // new/edit, competency/requirement new/edit, Settings.
  standard: "max-w-[720px]",
  // List/detail/dashboard/template-builder pages and the denser question
  // forms (code blocks, multi-line rubric/concept/follow-up editors).
  wide: "max-w-[1200px]",
  // Live Interview + Summary — the most information-dense screens (plan
  // §18), given the most room.
  full: "max-w-[1440px]",
};

export function PageContainer({
  width = "standard",
  className,
  children,
}: {
  width?: PageContainerWidth;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main className={cn("mx-auto flex w-full flex-1 flex-col gap-5 px-6 py-7", WIDTH_CLASSES[width], className)}>
      {children}
    </main>
  );
}
