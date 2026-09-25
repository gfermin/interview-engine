"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { INTERVIEW_LANGUAGES, INTERVIEW_LANGUAGE_LABELS } from "@/domain/interviews/interview-language";
import { INTERVIEW_STAGES, STAGE_LABELS } from "@/domain/interviews/stage-config";
import { t, type Locale } from "@/lib/i18n";
import type { FormActionState } from "./actions";

interface PositionOption {
  id: string;
  title: string;
}

interface TemplateFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  positions: PositionOption[];
  defaultPositionId?: string;
  locale?: Locale;
}

export function TemplateForm({ action, positions, defaultPositionId, locale = "en" }: TemplateFormProps) {
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
        <Label htmlFor="positionId">{t(locale, "templates.positionLabel")}</Label>
        <Select id="positionId" name="positionId" defaultValue={defaultPositionId ?? ""}>
          <option value="" disabled>
            {t(locale, "templates.selectPositionPlaceholder")}
          </option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.title}
            </option>
          ))}
        </Select>
        {state?.fieldErrors?.positionId ? (
          <p className="text-xs text-destructive">{state.fieldErrors.positionId[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stage">{t(locale, "templates.stageLabel")}</Label>
        <Select id="stage" name="stage" defaultValue="">
          <option value="" disabled>
            {t(locale, "templates.selectStagePlaceholder")}
          </option>
          {INTERVIEW_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </Select>
        {state?.fieldErrors?.stage ? (
          <p className="text-xs text-destructive">{state.fieldErrors.stage[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="interviewLanguage">{t(locale, "templates.interviewLanguageLabel")}</Label>
        <Select id="interviewLanguage" name="interviewLanguage" defaultValue="">
          <option value="" disabled>
            {t(locale, "templates.selectLanguagePlaceholder")}
          </option>
          {INTERVIEW_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {INTERVIEW_LANGUAGE_LABELS[language]}
            </option>
          ))}
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {t(locale, "templates.interviewLanguageHelp")}
        </p>
        {state?.fieldErrors?.interviewLanguage ? (
          <p className="text-xs text-destructive">{state.fieldErrors.interviewLanguage[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t(locale, "templates.templateNameLabel")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t(locale, "templates.templateNamePlaceholder")}
        />
        {state?.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t(locale, "templates.creatingButton") : t(locale, "templates.createDraftTemplateTitle")}
      </Button>
    </form>
  );
}
