"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { INTERVIEW_LANGUAGE_LABELS, type InterviewLanguage } from "@/domain/interviews/interview-language";
import { STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import { t, type Locale } from "@/lib/i18n";
import type { FormActionState } from "./actions";

interface TemplateOption {
  id: string;
  name: string;
  stage: string;
  interviewLanguage: string;
  version: number;
  positionTitle: string;
}

interface StartSessionFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  templates: TemplateOption[];
  locale?: Locale;
}

export function StartSessionForm({ action, templates, locale = "en" }: StartSessionFormProps) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  // Grouped by Position rather than prefixed onto every option's label — a
  // template's own name often already repeats its Position title (e.g. "X —
  // Technical Interview"), which used to show up twice per option (plan
  // §40.6 polish fix).
  const templatesByPosition = new Map<string, TemplateOption[]>();
  for (const template of templates) {
    const group = templatesByPosition.get(template.positionTitle) ?? [];
    group.push(template);
    templatesByPosition.set(template.positionTitle, group);
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="templateId">{t(locale, "candidates.publishedTemplateLabel")}</Label>
        <Select id="templateId" name="templateId" defaultValue="">
          <option value="" disabled>
            {t(locale, "candidates.selectTemplatePlaceholder")}
          </option>
          {[...templatesByPosition.entries()].map(([positionTitle, group]) => (
            <optgroup key={positionTitle} label={positionTitle}>
              {group.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({STAGE_LABELS[template.stage as InterviewStage]},{" "}
                  {INTERVIEW_LANGUAGE_LABELS[template.interviewLanguage as InterviewLanguage]}, v
                  {template.version})
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        {state?.fieldErrors?.templateId ? (
          <p className="text-xs text-destructive">{state.fieldErrors.templateId[0]}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t(locale, "candidates.starting") : t(locale, "candidates.startSessionButton")}
      </Button>
    </form>
  );
}
