"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { t, type Locale } from "@/lib/i18n";
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
  locale?: Locale;
}

const toLines = (values?: string[]) => (values ?? []).join("\n");

export function QuestionForm({
  action,
  competencies,
  showCodeFields,
  defaultValues,
  submitLabel,
  locale = "en",
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
          <Label htmlFor="competencyId">{t(locale, "templates.competencyLabel")}</Label>
          <Select
            id="competencyId"
            name="competencyId"
            defaultValue={defaultValues?.competencyId ?? ""}
          >
            <option value="" disabled>
              {t(locale, "templates.selectEllipsis")}
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
          <Label htmlFor="difficulty">{t(locale, "templates.difficultyLabel")}</Label>
          <Select
            id="difficulty"
            name="difficulty"
            defaultValue={defaultValues?.difficulty ?? "medium"}
          >
            {/* Difficulty enum values (easy/medium/hard) are domain data, not
                UI chrome — they stay English regardless of app language. */}
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="importance">{t(locale, "templates.importanceLabel")}</Label>
          <Select
            id="importance"
            name="importance"
            defaultValue={defaultValues?.importance ?? "core"}
          >
            {/* Importance enum values (core/secondary/optional) are domain
                data, not UI chrome — they stay English regardless of app
                language. */}
            <option value="core">Core</option>
            <option value="secondary">Secondary</option>
            <option value="optional">Optional</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="text">{t(locale, "templates.questionTextLabel")}</Label>
        <Textarea
          id="text"
          name="text"
          rows={3}
          placeholder={t(locale, "templates.questionTextPlaceholder")}
          defaultValue={defaultValues?.text}
          required
        />
        {fieldError("text")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jdRequirementTag">
          {t(locale, "templates.jdRequirementLabel")}{" "}
          <span className="text-muted-foreground">{t(locale, "templates.optionalTag")}</span>
        </Label>
        <Input
          id="jdRequirementTag"
          name="jdRequirementTag"
          placeholder={t(locale, "templates.jdRequirementPlaceholder")}
          defaultValue={defaultValues?.jdRequirementTag ?? ""}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expected">{t(locale, "templates.expectedAnswerLabel")}</Label>
          <Textarea
            id="expected"
            name="expected"
            rows={4}
            defaultValue={defaultValues?.expected ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="strong">{t(locale, "templates.strongAnswerLabel")}</Label>
          <Textarea
            id="strong"
            name="strong"
            rows={4}
            defaultValue={defaultValues?.strong ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acceptable">{t(locale, "templates.acceptableAnswerLabel")}</Label>
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
            {t(locale, "templates.keyConceptsLabel")}{" "}
            <span className="text-muted-foreground">{t(locale, "templates.onePerLineTag")}</span>
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
            {t(locale, "templates.redFlagsLabel")}{" "}
            <span className="text-muted-foreground">{t(locale, "templates.onePerLineTag")}</span>
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
            {t(locale, "templates.followUpsLabel")}{" "}
            <span className="text-muted-foreground">{t(locale, "templates.onePerLineTag")}</span>
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
            {t(locale, "templates.rubricLabel")}{" "}
            <span className="text-muted-foreground">{t(locale, "templates.rubricLinesTag")}</span>
          </Label>
          <Textarea
            id="rubric"
            name="rubric"
            rows={3}
            placeholder={t(locale, "templates.rubricPlaceholder")}
            defaultValue={toLines(defaultValues?.rubric)}
          />
        </div>
      </div>

      {showCodeFields ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">
              {t(locale, "templates.codeExerciseLabel")}{" "}
              <span className="text-muted-foreground">{t(locale, "templates.optionalTag")}</span>
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
              {t(locale, "templates.solutionLabel")}{" "}
              <span className="text-muted-foreground">{t(locale, "templates.optionalTag")}</span>
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
              {t(locale, "templates.altSolutionsLabel")}{" "}
              <span className="text-muted-foreground">{t(locale, "templates.optionalTag")}</span>
            </Label>
            <Textarea
              id="altSolutions"
              name="altSolutions"
              rows={2}
              placeholder={t(locale, "templates.altSolutionsPlaceholder")}
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
        {pending ? t(locale, "templates.savingButton") : submitLabel}
      </Button>
    </form>
  );
}
