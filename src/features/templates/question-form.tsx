"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormActionState } from "./actions";

interface CompetencyOption {
  id: string;
  name: string;
}

interface QuestionFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  competencies: CompetencyOption[];
  showCodeFields: boolean;
  defaultValues?: {
    competencyId?: string;
    text?: string;
    difficulty?: string;
    importance?: string;
    expected?: string | null;
    strong?: string | null;
    acceptable?: string | null;
    concepts?: string[];
    redFlags?: string[];
    followUps?: string[];
    rubric?: string[];
    code?: string | null;
    solution?: string | null;
    jdRequirementTag?: string | null;
    altSolutions?: string | null;
  };
  submitLabel: string;
}

const toLines = (values?: string[]) => (values ?? []).join("\n");

export function QuestionForm({
  action,
  competencies,
  showCodeFields,
  defaultValues,
  submitLabel,
}: QuestionFormProps) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-xs text-destructive">{state.fieldErrors[name]![0]}</p>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3 flex flex-col gap-1.5 sm:col-span-1">
          <Label htmlFor="competencyId">Competency</Label>
          <Select
            id="competencyId"
            name="competencyId"
            defaultValue={defaultValues?.competencyId ?? ""}
          >
            <option value="" disabled>
              Select...
            </option>
            {competencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {fieldError("competencyId")}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select
            id="difficulty"
            name="difficulty"
            defaultValue={defaultValues?.difficulty ?? "medium"}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="importance">Importance</Label>
          <Select
            id="importance"
            name="importance"
            defaultValue={defaultValues?.importance ?? "core"}
          >
            <option value="core">Core</option>
            <option value="secondary">Secondary</option>
            <option value="optional">Optional</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="text">Question text</Label>
        <Textarea
          id="text"
          name="text"
          rows={3}
          placeholder="What is the question the interviewer asks?"
          defaultValue={defaultValues?.text}
          required
        />
        {fieldError("text")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jdRequirementTag">
          JD requirement <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="jdRequirementTag"
          name="jdRequirementTag"
          placeholder="e.g. API Testing"
          defaultValue={defaultValues?.jdRequirementTag ?? ""}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expected">Expected answer</Label>
          <Textarea
            id="expected"
            name="expected"
            rows={4}
            defaultValue={defaultValues?.expected ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="strong">Strong answer</Label>
          <Textarea
            id="strong"
            name="strong"
            rows={4}
            defaultValue={defaultValues?.strong ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acceptable">Acceptable answer</Label>
          <Textarea
            id="acceptable"
            name="acceptable"
            rows={4}
            defaultValue={defaultValues?.acceptable ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="concepts">
            Key concepts <span className="text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea
            id="concepts"
            name="concepts"
            rows={3}
            defaultValue={toLines(defaultValues?.concepts)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="redFlags">
            Red flags <span className="text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea
            id="redFlags"
            name="redFlags"
            rows={3}
            defaultValue={toLines(defaultValues?.redFlags)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="followUps">
            Follow-ups <span className="text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea
            id="followUps"
            name="followUps"
            rows={3}
            defaultValue={toLines(defaultValues?.followUps)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rubric">
            Rubric <span className="text-muted-foreground">(one line per 0-5 score)</span>
          </Label>
          <Textarea
            id="rubric"
            name="rubric"
            rows={3}
            placeholder={"0 - ...\n1 - ...\n...\n5 - ..."}
            defaultValue={toLines(defaultValues?.rubric)}
          />
        </div>
      </div>

      {showCodeFields ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">
              Code exercise <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="code"
              name="code"
              rows={6}
              className="font-mono text-sm"
              defaultValue={defaultValues?.code ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="solution">
              Solution <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="solution"
              name="solution"
              rows={6}
              className="font-mono text-sm"
              defaultValue={defaultValues?.solution ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="altSolutions">
              Alternate solutions <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="altSolutions"
              name="altSolutions"
              rows={2}
              placeholder="Other valid approaches besides the primary solution..."
              defaultValue={defaultValues?.altSolutions ?? ""}
            />
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="code" value="" />
          <input type="hidden" name="altSolutions" value="" />
        </>
      )}
      {!showCodeFields ? <input type="hidden" name="solution" value="" /> : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
