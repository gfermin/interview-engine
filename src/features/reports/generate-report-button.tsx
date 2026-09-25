"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { t, type Locale } from "@/lib/i18n";
import type { FormActionState } from "./actions";

export function GenerateReportButton({
  action,
  locale = "en",
}: {
  action: (
    prevState: FormActionState | undefined
  ) => Promise<FormActionState | undefined>;
  locale?: Locale;
}) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  return (
    <div className="flex flex-col items-start gap-1.5">
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      <form action={formAction}>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t(locale, "interview.generating") : t(locale, "interview.generateReport")}
        </Button>
      </form>
    </div>
  );
}
