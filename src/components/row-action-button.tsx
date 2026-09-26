"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * A plain icon submit button whose form action is a no-argument bound
 * Server Action, with an optional confirm-before-submit guard — the same
 * shape `features/templates/template-actions.tsx`'s own `RowActionButton`
 * already established for row-level deletes, generalized here (plan Phase
 * 23/§44.6) for the two new report-delete call sites (Summary's report
 * list, the Reports Hub) that live outside the templates feature. Kept as a
 * separate copy rather than importing the templates-local one, so neither
 * call site risks the other's future changes.
 */
export function RowActionButton({
  action,
  icon,
  label,
  variant = "ghost",
  confirmMessage,
}: {
  action: () => Promise<void>;
  icon: ReactNode;
  label: string;
  variant?: "ghost" | "outline" | "destructive";
  confirmMessage?: string;
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
      <Button type="submit" variant={variant} size="icon-sm" aria-label={label} title={label}>
        {icon}
      </Button>
    </form>
  );
}
