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
    englishRequired: boolean;
    englishMinLevel: number;
  };
}

const FIELDS: { name: "passThreshold" | "borderlineMin" | "criticalMin" | "minCompletion"; label: string }[] = [
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

      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
        <label className="flex items-center gap-2 text-[12.5px]">
          <input
            type="checkbox"
            name="englishRequired"
            defaultChecked={defaultValues.englishRequired}
            className="size-3.5"
          />
          English assessment required for PASS
        </label>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="englishMinLevel">Min. English level (1-5)</Label>
          <Input
            id="englishMinLevel"
            name="englishMinLevel"
            type="number"
            min={1}
            max={5}
            defaultValue={defaultValues.englishMinLevel}
            className="w-24"
          />
          {state?.fieldErrors?.englishMinLevel ? (
            <p className="text-xs text-destructive">{state.fieldErrors.englishMinLevel[0]}</p>
          ) : null}
        </div>
      </div>

      <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
        {pending ? "Saving..." : "Save Scoring Configuration"}
      </Button>
    </form>
  );
}
