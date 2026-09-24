"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
}

export function CompetencyForm({ action, defaultValues, submitLabel }: CompetencyFormProps) {
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
        <Label htmlFor="name">Competency name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Test Automation Architecture"
          defaultValue={defaultValues?.name}
          required
        />
        {state?.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="weight">Weight (%)</Label>
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
            Critical (knockout if below the critical minimum)
          </Label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expectedDepth">
          Expected depth <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="expectedDepth"
          name="expectedDepth"
          rows={3}
          placeholder='Seniority-relative anchor for "3 — Meets Expected Level" on this competency, e.g. "Explains WHY, not just HOW; architecture-level trade-offs expected."'
          defaultValue={defaultValues?.expectedDepth ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Read by the report/rubric display only — never changes how scores are
          calculated (plan §39.7).
        </p>
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
