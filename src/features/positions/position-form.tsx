"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t, type Locale } from "@/lib/i18n";
import { ROLE_FAMILY_SUGGESTIONS, SENIORITY_SUGGESTIONS } from "@/lib/reference-data";
import type { FormActionState } from "./actions";

interface PositionFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  defaultValues?: {
    title?: string;
    department?: string | null;
    roleFamily?: string | null;
    seniority?: string | null;
  };
  submitLabel: string;
  locale?: Locale;
}

export function PositionForm({ action, defaultValues, submitLabel, locale = "en" }: PositionFormProps) {
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
        <Label htmlFor="title">{t(locale, "positions.positionTitleLabel")}</Label>
        <Input
          id="title"
          name="title"
          placeholder={t(locale, "positions.positionTitlePlaceholder")}
          defaultValue={defaultValues?.title}
          required
        />
        {state?.fieldErrors?.title ? (
          <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="roleFamily">{t(locale, "positions.roleFamilyLabel")}</Label>
          <Input
            id="roleFamily"
            name="roleFamily"
            list="role-family-suggestions"
            placeholder={t(locale, "positions.roleFamilyPlaceholder")}
            defaultValue={defaultValues?.roleFamily ?? ""}
          />
          <datalist id="role-family-suggestions">
            {ROLE_FAMILY_SUGGESTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seniority">{t(locale, "positions.seniorityLabel")}</Label>
          <Input
            id="seniority"
            name="seniority"
            list="seniority-suggestions"
            placeholder={t(locale, "positions.seniorityPlaceholder")}
            defaultValue={defaultValues?.seniority ?? ""}
          />
          <datalist id="seniority-suggestions">
            {SENIORITY_SUGGESTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        {t(locale, "positions.freeTextHelp")}
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="department">{t(locale, "positions.departmentLabel")}</Label>
        <Input
          id="department"
          name="department"
          placeholder={t(locale, "positions.departmentPlaceholder")}
          defaultValue={defaultValues?.department ?? ""}
        />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t(locale, "positions.saving") : submitLabel}
      </Button>
    </form>
  );
}
