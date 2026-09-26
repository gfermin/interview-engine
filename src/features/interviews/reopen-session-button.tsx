"use client";

import { Button } from "@/components/ui/button";
import { t, type Locale } from "@/lib/i18n";

/**
 * Reopen is a meaningful state change — it unfreezes ratings and, once a
 * decision exists, means the interview needs to be re-decided (plan §21/§38:
 * the prior decision isn't deleted, but recording a new one overwrites it)
 * — so it gets the same confirm-before-submit guard the templates feature
 * already uses for destructive row actions, rather than firing on a single
 * click.
 */
export function ReopenSessionButton({
  action,
  locale = "en",
}: {
  action: () => Promise<void>;
  locale?: Locale;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t(locale, "interview.reopenConfirm"))) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="outline" size="sm">
        {t(locale, "interview.reopen")}
      </Button>
    </form>
  );
}
