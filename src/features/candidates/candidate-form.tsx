"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t, type Locale } from "@/lib/i18n";
import type { FormActionState } from "./actions";

interface CandidateFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  defaultValues?: {
    name?: string;
    email?: string | null;
    notes?: string | null;
  };
  submitLabel: string;
  locale?: Locale;
}

export function CandidateForm({ action, defaultValues, submitLabel, locale = "en" }: CandidateFormProps) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t(locale, "candidates.fullNameLabel")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t(locale, "candidates.fullNamePlaceholder")}
          defaultValue={defaultValues?.name}
          required
        />
        {state?.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t(locale, "candidates.emailLabel")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={t(locale, "candidates.emailPlaceholder")}
          defaultValue={defaultValues?.email ?? ""}
        />
        {state?.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t(locale, "candidates.notesLabel")}</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder={t(locale, "candidates.notesPlaceholder")}
          defaultValue={defaultValues?.notes ?? ""}
        />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t(locale, "candidates.saving") : submitLabel}
      </Button>
    </form>
  );
}
