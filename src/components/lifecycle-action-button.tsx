"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Generic Delete/Archive/Restore button shared across Positions, Templates,
 * Candidates, and Interview Sessions (plan Phase 23/§44.6) — reuses this
 * project's existing `window.confirm()` confirmation architecture (already
 * established by `ReopenSessionButton` and the Templates feature's own
 * `RowActionButton`) rather than introducing a new Dialog primitive. The
 * calling page decides which action (if any) to render by consulting the
 * same domain-layer lifecycle check the bound Server Action re-validates —
 * this button never guesses; it only presents a choice the page already
 * determined is valid.
 */
export function LifecycleActionButton({
  action,
  label,
  icon,
  confirmMessage,
  variant = "outline",
}: {
  action: () => Promise<void>;
  label: string;
  icon?: ReactNode;
  confirmMessage?: string;
  variant?: "outline" | "destructive" | "ghost";
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant={variant} size="sm">
        {icon}
        {label}
      </Button>
    </form>
  );
}
