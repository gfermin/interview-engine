"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t, type Locale } from "@/lib/i18n";
import type { FormActionState } from "./actions";

interface JobDescriptionEditorProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  defaultText?: string;
  version?: number;
  locale?: Locale;
}

export function JobDescriptionEditor({
  action,
  defaultText,
  version,
  locale = "en",
}: JobDescriptionEditorProps) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <Label htmlFor="rawText">{t(locale, "positions.jobDescriptionLabel")}</Label>
        {version ? (
          <span className="font-mono text-[10.5px] text-muted-foreground">
            v{version}
          </span>
        ) : null}
      </div>
      <Textarea
        id="rawText"
        name="rawText"
        rows={14}
        placeholder={t(locale, "positions.rawTextPlaceholder")}
        defaultValue={defaultText}
      />
      {state?.fieldErrors?.rawText ? (
        <p className="text-xs text-destructive">{state.fieldErrors.rawText[0]}</p>
      ) : null}
      {state?.error && !state.fieldErrors?.rawText ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending
          ? t(locale, "positions.saving")
          : defaultText
            ? t(locale, "positions.updateJobDescriptionButton")
            : t(locale, "positions.saveJobDescriptionButton")}
      </Button>
    </form>
  );
}
