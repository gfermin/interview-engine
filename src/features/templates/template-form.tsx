"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { INTERVIEW_STAGES, STAGE_LABELS } from "@/domain/interviews/stage-config";
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
}

export function TemplateForm({ action, positions, defaultPositionId }: TemplateFormProps) {
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
        <Label htmlFor="positionId">Position</Label>
        <Select id="positionId" name="positionId" defaultValue={defaultPositionId ?? ""}>
          <option value="" disabled>
            Select a Position...
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
        <Label htmlFor="stage">Interview Stage</Label>
        <Select id="stage" name="stage" defaultValue="">
          <option value="" disabled>
            Select a Stage...
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
        <Label htmlFor="name">Template name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. QA Automation Engineer — Technical Interview"
        />
        {state?.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating..." : "Create Draft Template"}
      </Button>
    </form>
  );
}
