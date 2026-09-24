"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import type { FormActionState } from "./actions";

interface TemplateOption {
  id: string;
  name: string;
  stage: string;
  version: number;
  positionTitle: string;
}

interface StartSessionFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  templates: TemplateOption[];
}

export function StartSessionForm({ action, templates }: StartSessionFormProps) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="templateId">Published template</Label>
        <Select id="templateId" name="templateId" defaultValue="">
          <option value="" disabled>
            Select a Template...
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.positionTitle} — {template.name} (
              {STAGE_LABELS[template.stage as InterviewStage]}, v{template.version})
            </option>
          ))}
        </Select>
        {state?.fieldErrors?.templateId ? (
          <p className="text-xs text-destructive">{state.fieldErrors.templateId[0]}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Starting..." : "Start Interview Session"}
      </Button>
    </form>
  );
}
