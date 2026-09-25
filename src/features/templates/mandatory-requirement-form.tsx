"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t, type Locale } from "@/lib/i18n";
import type { FormActionState } from "./actions";

interface MandatoryRequirementFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  defaultValues?: {
    label?: string;
    description?: string | null;
  };
  submitLabel: string;
  locale?: Locale;
}

export function MandatoryRequirementForm({
  action,
  defaultValues,
  submitLabel,
  locale = "en",
}: MandatoryRequirementFormProps) {
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
        <Label htmlFor="label">{t(locale, "templates.requirementLabel")}</Label>
        <Input
          id="label"
          name="label"
          placeholder={t(locale, "templates.requirementPlaceholder")}
          defaultValue={defaultValues?.label}
          required
        />
        {state?.fieldErrors?.label ? (
          <p className="text-xs text-destructive">{state.fieldErrors.label[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">
          {t(locale, "templates.descriptionLabel")}{" "}
          <span className="text-muted-foreground">{t(locale, "templates.optionalTag")}</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder={t(locale, "templates.descriptionPlaceholder")}
          defaultValue={defaultValues?.description ?? ""}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {t(locale, "templates.knockoutGateNote")}
      </p>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t(locale, "templates.savingButton") : submitLabel}
      </Button>
    </form>
  );
}
