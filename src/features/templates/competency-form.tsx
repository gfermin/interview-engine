"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t, type Locale } from "@/lib/i18n";
import type { FormActionState } from "./actions";

interface CompetencyFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  defaultValues?: {
    name?: string;
    weight?: number;
    critical?: boolean;
    expectedDepth?: string | null;
  };
  submitLabel: string;
  locale?: Locale;
}

export function CompetencyForm({ action, defaultValues, submitLabel, locale = "en" }: CompetencyFormProps) {
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
        <Label htmlFor="name">{t(locale, "templates.competencyNameLabel")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t(locale, "templates.competencyNamePlaceholder")}
          defaultValue={defaultValues?.name}
          required
        />
        {state?.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="weight">{t(locale, "templates.weightLabel")}</Label>
          <Input
            id="weight"
            name="weight"
            type="number"
            min={0}
            max={100}
            defaultValue={defaultValues?.weight ?? 0}
            required
          />
          {state?.fieldErrors?.weight ? (
            <p className="text-xs text-destructive">{state.fieldErrors.weight[0]}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            id="critical"
            name="critical"
            type="checkbox"
            defaultChecked={defaultValues?.critical}
            className="size-4 rounded border-input"
          />
          <Label htmlFor="critical" className="font-normal">
            {t(locale, "templates.criticalCheckboxLabel")}
          </Label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expectedDepth">
          {t(locale, "templates.expectedDepthLabel")}{" "}
          <span className="text-muted-foreground">{t(locale, "templates.optionalTag")}</span>
        </Label>
        <Textarea
          id="expectedDepth"
          name="expectedDepth"
          rows={3}
          placeholder={t(locale, "templates.expectedDepthPlaceholder")}
          defaultValue={defaultValues?.expectedDepth ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          {t(locale, "templates.expectedDepthHelp")}
        </p>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t(locale, "templates.savingButton") : submitLabel}
      </Button>
    </form>
  );
}
