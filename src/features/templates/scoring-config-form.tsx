"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormActionState } from "./actions";

interface ScoringConfigFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  defaultValues: {
    passThreshold: number;
    borderlineMin: number;
    criticalMin: number;
    minCompletion: number;
  };
}

const FIELDS: { name: keyof ScoringConfigFormProps["defaultValues"]; label: string }[] = [
  { name: "passThreshold", label: "Pass threshold (%)" },
  { name: "borderlineMin", label: "Borderline minimum (%)" },
  { name: "criticalMin", label: "Critical minimum (%)" },
  { name: "minCompletion", label: "Minimum completion (%)" },
];

export function ScoringConfigForm({ action, defaultValues }: ScoringConfigFormProps) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FIELDS.map(({ name, label }) => (
          <div key={name} className="flex flex-col gap-1.5">
            <Label htmlFor={name}>{label}</Label>
            <Input
              id={name}
              name={name}
              type="number"
              min={0}
              max={100}
              defaultValue={defaultValues[name]}
            />
            {state?.fieldErrors?.[name] ? (
              <p className="text-xs text-destructive">{state.fieldErrors[name]![0]}</p>
            ) : null}
          </div>
        ))}
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
        {pending ? "Saving..." : "Save Scoring Configuration"}
      </Button>
    </form>
  );
}
