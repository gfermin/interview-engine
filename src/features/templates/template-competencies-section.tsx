import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { InterviewStage } from "@/domain/interviews/stage-config";
import { t, type Locale } from "@/lib/i18n";
import type { AIActionState } from "./ai-actions";
import { AIActionButton } from "./ai-components";
import { RowActionButton } from "./template-actions";

interface CompetencyRow {
  id: string;
  name: string;
  weight: number;
  critical: boolean;
  expectedDepth: string | null;
}

/** The Competencies Card (plan Phase 34/AUDIT-021) — the weight-sum/coding-
 * exercise summary badges, the "Generate Draft" AI action (when the
 * template has no competencies yet and a Job Analysis exists), and the
 * competency table with its move/edit/delete row actions. Extracted out of
 * `app/templates/[id]/page.tsx`. Move/delete actions are passed unbound
 * (each row binds its own competencyId at render time, matching the
 * original page's inline `.bind()` calls). */
export function TemplateCompetenciesSection({
  templateId,
  editable,
  stage,
  includeCodeExercises,
  competencies,
  weightSum,
  hasJobAnalysis,
  generateTemplateDraftAction,
  moveCompetencyAction,
  deleteCompetencyAction,
  locale,
}: {
  templateId: string;
  editable: boolean;
  stage: InterviewStage;
  includeCodeExercises: boolean;
  competencies: CompetencyRow[];
  weightSum: number;
  hasJobAnalysis: boolean;
  generateTemplateDraftAction: (prevState: AIActionState | undefined) => Promise<AIActionState | undefined>;
  moveCompetencyAction: (templateId: string, competencyId: string, direction: "up" | "down") => Promise<void>;
  deleteCompetencyAction: (templateId: string, competencyId: string) => Promise<void>;
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[13.5px]">{t(locale, "templates.competenciesHeading")}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={weightSum === 100 ? "secondary" : "outline"}>
            {t(locale, "templates.weightsPrefix")}
            {weightSum}%
          </Badge>
          <Badge variant="outline">
            {t(locale, "templates.codingExerciseStatPrefix")}
            {stage === "technical" && includeCodeExercises
              ? t(locale, "templates.includedLabel")
              : t(locale, "templates.notIncludedLabel")}
          </Badge>
          {editable ? (
            <ButtonLink size="sm" variant="outline" href={`/templates/${templateId}/competencies/new`}>
              <Plus /> {t(locale, "templates.addCompetencyLabel")}
            </ButtonLink>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {competencies.length === 0 ? (
          <div className="flex flex-col gap-3 px-6 pb-4">
            <p className="text-sm text-muted-foreground">{t(locale, "templates.noCompetenciesMessage")}</p>
            {editable && hasJobAnalysis ? (
              <AIActionButton
                action={generateTemplateDraftAction}
                label={t(locale, "templates.generateDraftButton")}
                pendingLabel={t(locale, "templates.generatingDraftButton")}
                locale={locale}
              />
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(locale, "templates.tableName")}</TableHead>
                <TableHead>{t(locale, "templates.tableWeight")}</TableHead>
                <TableHead>{t(locale, "templates.criticalLabel")}</TableHead>
                <TableHead>{t(locale, "templates.tableExpectedDepth")}</TableHead>
                {editable ? <TableHead className="text-right">{t(locale, "templates.tableActions")}</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {competencies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.weight}%</TableCell>
                  <TableCell>
                    {c.critical ? <Badge variant="destructive">{t(locale, "templates.criticalLabel")}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground">
                    {c.expectedDepth ?? "—"}
                  </TableCell>
                  {editable ? (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <RowActionButton
                          action={moveCompetencyAction.bind(null, templateId, c.id, "up")}
                          icon={<ChevronUp />}
                          label={t(locale, "templates.moveUpLabel")}
                        />
                        <RowActionButton
                          action={moveCompetencyAction.bind(null, templateId, c.id, "down")}
                          icon={<ChevronDown />}
                          label={t(locale, "templates.moveDownLabel")}
                        />
                        <ButtonLink
                          variant="ghost"
                          size="icon-sm"
                          href={`/templates/${templateId}/competencies/${c.id}/edit`}
                          aria-label={t(locale, "templates.editLabel")}
                        >
                          <Pencil />
                        </ButtonLink>
                        <RowActionButton
                          action={deleteCompetencyAction.bind(null, templateId, c.id)}
                          icon={<Trash2 />}
                          label={t(locale, "templates.deleteLabel")}
                          variant="destructive"
                          confirmMessage={`${t(locale, "templates.deleteCompetencyConfirmPrefix")}${c.name}${t(locale, "templates.deleteCompetencyConfirmSuffix")}`}
                        />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
