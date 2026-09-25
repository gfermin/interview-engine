// The artifact's `.perfbar`/`.marker` visual (plan Phase 14 Task 14.1/§41):
// fail/borderline/pass zones sized to the session's *actual* configured
// thresholds (a genuine improvement over the artifact, whose zone widths
// were hardcoded to 50/70 regardless of its own configurable thresholds),
// plus a marker at the live overall score. `computeMarkerPosition` is
// exported separately so its boundary behavior (clamping, the
// not-yet-evaluated state) is unit-testable without rendering.

export interface MarkerPosition {
  /** Percent from the left edge, already clamped into the visible track. */
  left: number;
  /** False when there's no score yet (NOT_EVALUATED) — the marker renders
   * faded with a "—" label instead of a real position. */
  visible: boolean;
}

export function computeMarkerPosition(overall: number | null): MarkerPosition {
  if (overall === null) return { left: 0, visible: false };
  return { left: Math.max(1, Math.min(99, overall)), visible: true };
}

export function PerformanceBar({
  overall,
  borderlineMin,
  passThreshold,
}: {
  overall: number | null;
  borderlineMin: number;
  passThreshold: number;
}) {
  const marker = computeMarkerPosition(overall);
  const failWidth = Math.max(0, Math.min(100, borderlineMin));
  const borderlineWidth = Math.max(0, Math.min(100 - failWidth, passThreshold - borderlineMin));
  const passWidth = Math.max(0, 100 - failWidth - borderlineWidth);
  const label = overall === null ? "—" : `${Math.round(overall)}%`;

  return (
    <div
      className="relative flex h-[22px] overflow-hidden rounded-md border border-border"
      role="img"
      aria-label={`Performance: ${label}. Fail below ${borderlineMin}%, borderline ${borderlineMin}%–${passThreshold}%, pass at ${passThreshold}% or above.`}
    >
      <div className="h-full bg-fail-bg" style={{ width: `${failWidth}%` }} />
      <div className="h-full bg-borderline-bg" style={{ width: `${borderlineWidth}%` }} />
      <div className="h-full bg-pass-bg" style={{ width: `${passWidth}%` }} />
      <span
        className="pointer-events-none absolute top-0.5 font-mono text-[9px] text-ink-faint"
        style={{ left: `calc(${failWidth}% - 8px)` }}
      >
        {borderlineMin}
      </span>
      <span
        className="pointer-events-none absolute top-0.5 font-mono text-[9px] text-ink-faint"
        style={{ left: `calc(${failWidth + borderlineWidth}% - 8px)` }}
      >
        {passThreshold}
      </span>
      <div
        className={`absolute -top-1 h-[30px] w-0.5 bg-foreground transition-[left] duration-200 ${marker.visible ? "" : "opacity-25"}`}
        style={{ left: `${marker.left}%` }}
      >
        <span className="absolute -top-[17px] left-1/2 -translate-x-1/2 rounded bg-foreground px-1 py-px font-mono text-[10.5px] font-bold whitespace-nowrap text-background">
          {label}
        </span>
      </div>
    </div>
  );
}
