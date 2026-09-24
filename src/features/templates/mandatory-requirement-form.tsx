"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
}

export function MandatoryRequirementForm({
  action,
  defaultValues,
  submitLabel,
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
        <Label htmlFor="label">Requirement</Label>
        <Input
          id="label"
          name="label"
          placeholder="e.g. Work authorization in the hiring country"
          defaultValue={defaultValues?.label}
          required
        />
        {state?.fieldErrors?.label ? (
          <p className="text-xs text-destructive">{state.fieldErrors.label[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="What counts as demonstrated/not demonstrated for this requirement."
          defaultValue={defaultValues?.description ?? ""}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        A boolean knockout gate, not a scored competency (plan §4.3/§19) — if
        marked &ldquo;not met&rdquo; during an interview it fails the candidate
        independent of overall score.
      </p>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
