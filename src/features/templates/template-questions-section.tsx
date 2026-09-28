import Link from "next/link";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { difficultyBadgeClass } from "@/lib/question-style";
import { t, type Locale } from "@/lib/i18n";
import type { AIActionState } from "./ai-actions";
import { RegenerateQuestionButton } from "./ai-components";
import { RowActionButton } from "./template-actions";

interface QuestionRow {
  id: string;
  competencyId: string;
  text: string;
  difficulty: string;
  importance: string;
  jdRequirementTag: string | null;
}

interface CompetencyRow {
  id: string;
  name: string;
}

interface Blueprint {
  competencyName: string;
  coverage: string;
  questionTypeMix: string;
}

/** The Questions Card (plan Phase 34/AUDIT-021) — every competency's
 * question list (with the optional generation-blueprint disclosure) and
 * their move/regenerate/edit/delete row actions. Extracted out of
 * `app/templates/[id]/page.tsx`. Move/delete/regenerate actions are passed
 * unbound (each row binds its own questionId at render time, matching the
 * original page's inline `.bind()` calls). */
export function TemplateQuestionsSection({
  templateId,
  editable,
  competencies,
  questionsByCompetency,
  blueprints,
  moveQuestionAction,
  deleteQuestionAction,
  regenerateQuestionAction,
  locale,
}: {
  templateId: string;
  editable: boolean;
  competencies: CompetencyRow[];
  questionsByCompetency: Map<string, QuestionRow[]>;
  blueprints: Blueprint[];
  moveQuestionAction: (templateId: string, questionId: string, direction: "up" | "down") => Promise<void>;
  deleteQuestionAction: (templateId: string, questionId: string) => Promise<void>;
  regenerateQuestionAction: (
    templateId: string,
    questionId: string,
    prevState: AIActionState | undefined
  ) => Promise<AIActionState | undefined>;
  locale: Locale;
}) {
  const blueprintByCompetencyName = new Map(blueprints.map((b) => [b.competencyName, b]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[13.5px]">{t(locale, "templates.questionsHeading")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {competencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(locale, "templates.addCompetencyBeforeQuestionsPrefix")}
            <Link href={`/templates/${templateId}/competencies/new`} className="underline">
              {t(locale, "templates.competencyLinkText")}
            </Link>
            {t(locale, "templates.addCompetencyBeforeQuestionsSuffix")}
          </p>
        ) : (
          competencies.map((c, index) => {
            const competencyQuestions = questionsByCompetency.get(c.id) ?? [];
            const blueprint = blueprintByCompetencyName.get(c.name);
            return (
              <div key={c.id} className="flex flex-col gap-2">
                {index > 0 ? <Separator /> : null}
                <div className="flex items-center justify-between">
                  <h3 className="text-[12.5px] font-semibold">{c.name}</h3>
                  {editable ? (
                    <ButtonLink
                      size="xs"
                      variant="outline"
                      href={`/templates/${templateId}/questions/new?competencyId=${c.id}`}
                    >
                      <Plus /> {t(locale, "templates.addQuestionTitle")}
                    </ButtonLink>
                  ) : null}
                </div>
                {blueprint ? (
                  <details className="text-[11px] text-muted-foreground">
                    <summary className="cursor-pointer">{t(locale, "templates.generationBlueprintSummary")}</summary>
                    <div className="mt-1 flex flex-col gap-0.5 rounded-lg border border-border bg-muted/40 p-2">
                      <p>
                        <span className="font-medium">{t(locale, "templates.coverageLabel")}</span>
                        {blueprint.coverage}
                      </p>
                      <p>
                        <span className="font-medium">{t(locale, "templates.questionMixLabel")}</span>
                        {blueprint.questionTypeMix}
                      </p>
                    </div>
                  </details>
                ) : null}
                {competencyQuestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t(locale, "templates.noQuestionsMessage")}</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {competencyQuestions.map((q) => (
                      <li
                        key={q.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                      >
                        <div className="flex flex-col gap-1">
                          <p className="text-[12.5px] leading-snug">{q.text}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className={`capitalize ${difficultyBadgeClass(q.difficulty)}`}>
                              {q.difficulty}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {q.importance}
                            </Badge>
                            {q.jdRequirementTag ? (
                              <Badge variant="secondary" className="font-normal normal-case">
                                {t(locale, "templates.jdTagPrefix")}
                                {q.jdRequirementTag}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        {editable ? (
                          <div className="flex shrink-0 items-start gap-1">
                            <RowActionButton
                              action={moveQuestionAction.bind(null, templateId, q.id, "up")}
                              icon={<ChevronUp />}
                              label={t(locale, "templates.moveUpLabel")}
                            />
                            <RowActionButton
                              action={moveQuestionAction.bind(null, templateId, q.id, "down")}
                              icon={<ChevronDown />}
                              label={t(locale, "templates.moveDownLabel")}
                            />
                            <RegenerateQuestionButton
                              action={regenerateQuestionAction.bind(null, templateId, q.id)}
                              locale={locale}
                            />
                            <ButtonLink
                              variant="ghost"
                              size="icon-sm"
                              href={`/templates/${templateId}/questions/${q.id}/edit`}
                              aria-label={t(locale, "templates.editLabel")}
                            >
                              <Pencil />
                            </ButtonLink>
                            <RowActionButton
                              action={deleteQuestionAction.bind(null, templateId, q.id)}
                              icon={<Trash2 />}
                              label={t(locale, "templates.deleteLabel")}
                              variant="destructive"
                              confirmMessage={t(locale, "templates.deleteQuestionConfirm")}
                            />
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
