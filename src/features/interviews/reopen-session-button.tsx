"use client";

import { Button } from "@/components/ui/button";

/**
 * Reopen is a meaningful state change — it unfreezes ratings and, once a
 * decision exists, means the interview needs to be re-decided (plan §21/§38:
 * the prior decision isn't deleted, but recording a new one overwrites it)
 * — so it gets the same confirm-before-submit guard the templates feature
 * already uses for destructive row actions, rather than firing on a single
 * click.
 */
export function ReopenSessionButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Reopen this interview? Ratings become editable again, and any recorded decision will need to be re-confirmed."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="outline" size="sm">
        Reopen
      </Button>
    </form>
  );
}
