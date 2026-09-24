import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { getPosition } from "@/features/positions/queries";
import {
  createNewVersionAction,
  deleteCompetencyAction,
  deleteMandatoryRequirementAction,
  deleteQuestionAction,
  moveCompetencyAction,
  moveMandatoryRequirementAction,
  moveQuestionAction,
  publishTemplateAction,
  updateScoringConfigAction,
} from "@/features/templates/actions";
import {
  getTemplate,
  listCompetencies,
  listMandatoryRequirements,
  listQuestions,
} from "@/features/templates/queries";
import { ScoringConfigForm } from "@/features/templates/scoring-config-form";
import { NewVersionButton, PublishButton, RowActionButton } from "@/features/templates/template-actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  draft: "outline",
  approved: "secondary",
  locked: "default",
} as const;

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  const stage = template.stage as InterviewStage;
  const [position, competencies, mandatoryRequirements, questions] = await Promise.all([
    getPosition(template.positionId),
    listCompetencies(id),
    listMandatoryRequirements(id),
    listQuestions(id),
  ]);

  const editable = isTemplateEditable(template);
  const stageConfig = getStageConfig(stage);
  const weightSum = competencies.reduce((sum, c) => sum + c.weight, 0);
  const questionsByCompetency = new Map<string, typeof questions>();
  for (const q of questions) {
    const list = questionsByCompetency.get(q.competencyId) ?? [];
    list.push(q);
    questionsByCompetency.set(q.competencyId, list);
  }

  return (
    <>
      <AppTopbar title={template.name} />
      <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-[15px]">{template.name}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {position ? (
                  <Link
                    href={`/positions/${position.id}`}
                    className="text-[12.5px] text-muted-foreground hover:underline"
                  >
                    {position.title}
                  </Link>
                ) : null}
                <Badge variant="secondary">{stageConfig.label}</Badge>
                <Badge variant="outline" className="font-mono">
                  v{template.version}
                </Badge>
                <Badge variant={STATUS_VARIANT[template.status]} className="capitalize">
                  {template.status}
                </Badge>
              </div>
              {!editable ? (
                <p className="mt-2 max-w-md text-[11px] text-muted-foreground">
                  {template.status === "approved"
                    ? "Published — no longer editable. Create a new version to make changes."
                    : "Locked — a candidate session references this exact version. Create a new version to make changes."}
                </p>
              ) : null}
            </div>
            <div>
              {editable ? (
                <PublishButton action={publishTemplateAction.bind(null, template.id)} />
              ) : (
                <NewVersionButton action={createNewVersionAction.bind(null, template.id)} />
              )}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Scoring Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {editable ? (
              <ScoringConfigForm
                action={updateScoringConfigAction.bind(null, template.id)}
                defaultValues={{
                  passThreshold: template.passThreshold,
                  borderlineMin: template.borderlineMin,
                  criticalMin: template.criticalMin,
                  minCompletion: template.minCompletion,
                }}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <ConfigStat label="Pass threshold" value={template.passThreshold} />
                <ConfigStat label="Borderline min" value={template.borderlineMin} />
                <ConfigStat label="Critical min" value={template.criticalMin} />
                <ConfigStat label="Min completion" value={template.minCompletion} />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[13.5px]">Competencies</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={weightSum === 100 ? "secondary" : "outline"}>
                Weights: {weightSum}%
              </Badge>
              {editable ? (
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/templates/${id}/competencies/new`} />}
                >
                  <Plus /> Add Competency
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {competencies.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">No competencies yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>Expected depth</TableHead>
                    {editable ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competencies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.weight}%</TableCell>
                      <TableCell>
                        {c.critical ? <Badge variant="destructive">Critical</Badge> : "—"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {c.expectedDepth ?? "—"}
                      </TableCell>
                      {editable ? (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <RowActionButton
                              action={moveCompetencyAction.bind(null, id, c.id, "up")}
                              icon={<ChevronUp />}
                              label="Move up"
                            />
                            <RowActionButton
                              action={moveCompetencyAction.bind(null, id, c.id, "down")}
                              icon={<ChevronDown />}
                              label="Move down"
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              render={
                                <Link href={`/templates/${id}/competencies/${c.id}/edit`} />
                              }
                              aria-label="Edit"
                            >
                              <Pencil />
                            </Button>
                            <RowActionButton
                              action={deleteCompetencyAction.bind(null, id, c.id)}
                              icon={<Trash2 />}
                              label="Delete"
                              variant="destructive"
                              confirmMessage={`Delete competency "${c.name}"? This also deletes its questions.`}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[13.5px]">Mandatory Requirements</CardTitle>
            {editable ? (
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/templates/${id}/requirements/new`} />}
              >
                <Plus /> Add Requirement
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="p-0">
            {mandatoryRequirements.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">
                No mandatory requirements yet — boolean knockout gates independent
                of competency scoring (plan §4.3/§19).
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Description</TableHead>
                    {editable ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mandatoryRequirements.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="max-w-[320px] truncate text-muted-foreground">
                        {r.description ?? "—"}
                      </TableCell>
                      {editable ? (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <RowActionButton
                              action={moveMandatoryRequirementAction.bind(null, id, r.id, "up")}
                              icon={<ChevronUp />}
                              label="Move up"
                            />
                            <RowActionButton
                              action={moveMandatoryRequirementAction.bind(null, id, r.id, "down")}
                              icon={<ChevronDown />}
                              label="Move down"
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              render={<Link href={`/templates/${id}/requirements/${r.id}/edit`} />}
                              aria-label="Edit"
                            >
                              <Pencil />
                            </Button>
                            <RowActionButton
                              action={deleteMandatoryRequirementAction.bind(null, id, r.id)}
                              icon={<Trash2 />}
                              label="Delete"
                              variant="destructive"
                              confirmMessage={`Delete requirement "${r.label}"?`}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Questions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {competencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add a competency before adding questions.
              </p>
            ) : (
              competencies.map((c, index) => {
                const competencyQuestions = questionsByCompetency.get(c.id) ?? [];
                return (
                  <div key={c.id} className="flex flex-col gap-2">
                    {index > 0 ? <Separator /> : null}
                    <div className="flex items-center justify-between">
                      <h3 className="text-[12.5px] font-semibold">{c.name}</h3>
                      {editable ? (
                        <Button
                          size="xs"
                          variant="outline"
                          render={
                            <Link href={`/templates/${id}/questions/new?competencyId=${c.id}`} />
                          }
                        >
                          <Plus /> Add Question
                        </Button>
                      ) : null}
                    </div>
                    {competencyQuestions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No questions yet.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {competencyQuestions.map((q) => (
                          <li
                            key={q.id}
                            className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                          >
                            <div className="flex flex-col gap-1">
                              <p className="text-[12.5px] leading-snug">{q.text}</p>
                              <div className="flex gap-1.5">
                                <Badge variant="outline" className="capitalize">
                                  {q.difficulty}
                                </Badge>
                                <Badge variant="outline" className="capitalize">
                                  {q.importance}
                                </Badge>
                              </div>
                            </div>
                            {editable ? (
                              <div className="flex shrink-0 gap-1">
                                <RowActionButton
                                  action={moveQuestionAction.bind(null, id, q.id, "up")}
                                  icon={<ChevronUp />}
                                  label="Move up"
                                />
                                <RowActionButton
                                  action={moveQuestionAction.bind(null, id, q.id, "down")}
                                  icon={<ChevronDown />}
                                  label="Move down"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  render={<Link href={`/templates/${id}/questions/${q.id}/edit`} />}
                                  aria-label="Edit"
                                >
                                  <Pencil />
                                </Button>
                                <RowActionButton
                                  action={deleteQuestionAction.bind(null, id, q.id)}
                                  icon={<Trash2 />}
                                  label="Delete"
                                  variant="destructive"
                                  confirmMessage="Delete this question?"
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
      </main>
    </>
  );
}

function ConfigStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm">{value}%</dd>
    </div>
  );
}
