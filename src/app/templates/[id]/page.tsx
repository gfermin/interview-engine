import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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
import { getJobDescription, getPosition } from "@/features/positions/queries";
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
import { AIActionButton, RegenerateQuestionButton } from "@/features/templates/ai-components";
import {
  analyzeJobDescriptionAction,
  generateTemplateDraftAction,
  regenerateQuestionAction,
} from "@/features/templates/ai-actions";
import {
  getLatestJobAnalysis,
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
  const [position, competencies, mandatoryRequirements, questions, jobDescription] =
    await Promise.all([
      getPosition(template.positionId),
      listCompetencies(id),
      listMandatoryRequirements(id),
      listQuestions(id),
      template.jobDescriptionId ? getJobDescription(template.jobDescriptionId) : null,
    ]);
  const jobAnalysis = template.jobDescriptionId
    ? await getLatestJobAnalysis(template.jobDescriptionId)
    : null;

  const editable = isTemplateEditable(template);
  const stageConfig = getStageConfig(stage);
  const weightSum = competencies.reduce((sum, c) => sum + c.weight, 0);
  const questionsByCompetency = new Map<string, typeof questions>();
  for (const q of questions) {
    const list = questionsByCompetency.get(q.competencyId) ?? [];
    list.push(q);
    questionsByCompetency.set(q.competencyId, list);
  }

  const roleFamilyMismatch = mismatches(position?.roleFamily ?? null, jobAnalysis?.detectedRoleFamily ?? null);
  const seniorityMismatch = mismatches(position?.seniority ?? null, jobAnalysis?.detectedSeniority ?? null);

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
            <CardTitle className="text-[13.5px]">Job Description &amp; AI Analysis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!jobDescription ? (
              <p className="text-sm text-muted-foreground">
                This template isn&apos;t linked to a Job Description version.
                Add one on the{" "}
                <Link href={`/positions/${template.positionId}`} className="underline">
                  Position
                </Link>
                , then create a new template.
              </p>
            ) : (
              <>
                <details>
                  <summary className="cursor-pointer text-[12.5px] text-muted-foreground">
                    Job Description text (v{jobDescription.version})
                  </summary>
                  <p className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[12.5px] whitespace-pre-wrap">
                    {jobDescription.rawText}
                  </p>
                </details>

                {editable ? (
                  <AIActionButton
                    action={analyzeJobDescriptionAction.bind(null, template.id)}
                    label={jobAnalysis ? "Re-analyze Job Description" : "Analyze Job Description"}
                    pendingLabel="Analyzing..."
                  />
                ) : null}

                {jobAnalysis ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={roleFamilyMismatch ? "destructive" : "secondary"}>
                        Detected role: {jobAnalysis.detectedRoleFamily ?? "—"}
                      </Badge>
                      <Badge variant={seniorityMismatch ? "destructive" : "secondary"}>
                        Detected seniority: {jobAnalysis.detectedSeniority ?? "—"}
                      </Badge>
                    </div>
                    {roleFamilyMismatch || seniorityMismatch ? (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[12px] text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        <p>
                          The Job Description reads differently than the
                          Position&apos;s selected Role Family/Seniority
                          (&ldquo;{position?.roleFamily ?? "—"}&rdquo; /{" "}
                          &ldquo;{position?.seniority ?? "—"}&rdquo;). Your
                          selection is not changed automatically — review
                          before generating.
                        </p>
                      </div>
                    ) : null}
                    <dl className="grid grid-cols-1 gap-2 text-[12.5px] sm:grid-cols-3">
                      <RequirementList label="Mandatory" items={jobAnalysis.mandatoryRequirements} />
                      <RequirementList label="Preferred" items={jobAnalysis.preferredRequirements} />
                      <RequirementList label="Optional" items={jobAnalysis.optionalRequirements} />
                    </dl>
                    {jobAnalysis.notes ? (
                      <p className="text-[12px] text-muted-foreground">{jobAnalysis.notes}</p>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
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
                  englishRequired: template.englishRequired,
                  englishMinLevel: template.englishMinLevel,
                }}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <ConfigStat label="Pass threshold" value={template.passThreshold} />
                <ConfigStat label="Borderline min" value={template.borderlineMin} />
                <ConfigStat label="Critical min" value={template.criticalMin} />
                <ConfigStat label="Min completion" value={template.minCompletion} />
                <ConfigStat
                  label="English required"
                  value={template.englishRequired ? `Yes (≥${template.englishMinLevel})` : "No"}
                  suffix=""
                />
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
                <ButtonLink size="sm" variant="outline" href={`/templates/${id}/competencies/new`}>
                  <Plus /> Add Competency
                </ButtonLink>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {competencies.length === 0 ? (
              <div className="flex flex-col gap-3 px-6 pb-4">
                <p className="text-sm text-muted-foreground">
                  No competencies yet — add them manually above, or generate a
                  draft from the Job Analysis.
                </p>
                {editable && jobAnalysis ? (
                  <AIActionButton
                    action={generateTemplateDraftAction.bind(null, template.id)}
                    label="Generate Draft (Competencies, Requirements & Questions)"
                    pendingLabel="Generating draft... this can take a minute"
                  />
                ) : null}
              </div>
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
                            <ButtonLink
                              variant="ghost"
                              size="icon-sm"
                              href={`/templates/${id}/competencies/${c.id}/edit`}
                              aria-label="Edit"
                            >
                              <Pencil />
                            </ButtonLink>
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
              <ButtonLink size="sm" variant="outline" href={`/templates/${id}/requirements/new`}>
                <Plus /> Add Requirement
              </ButtonLink>
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
                            <ButtonLink
                              variant="ghost"
                              size="icon-sm"
                              href={`/templates/${id}/requirements/${r.id}/edit`}
                              aria-label="Edit"
                            >
                              <Pencil />
                            </ButtonLink>
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
                Add a{" "}
                <Link href={`/templates/${id}/competencies/new`} className="underline">
                  competency
                </Link>{" "}
                before adding questions.
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
                        <ButtonLink
                          size="xs"
                          variant="outline"
                          href={`/templates/${id}/questions/new?competencyId=${c.id}`}
                        >
                          <Plus /> Add Question
                        </ButtonLink>
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
                              <div className="flex shrink-0 items-start gap-1">
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
                                <RegenerateQuestionButton
                                  action={regenerateQuestionAction.bind(null, id, q.id)}
                                />
                                <ButtonLink
                                  variant="ghost"
                                  size="icon-sm"
                                  href={`/templates/${id}/questions/${q.id}/edit`}
                                  aria-label="Edit"
                                >
                                  <Pencil />
                                </ButtonLink>
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

/** Non-blocking mismatch check (plan §39.3) — the system never overrides
 * the human's selection, it only flags a divergence for review. */
function mismatches(selected: string | null, detected: string | null): boolean {
  if (!selected || !detected) return false;
  return selected.trim().toLowerCase() !== detected.trim().toLowerCase();
}

function ConfigStat({
  label,
  value,
  suffix = "%",
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm">
        {value}
        {suffix}
      </dd>
    </div>
  );
}

function RequirementList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd>
        {items.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <ul className="list-disc pl-4">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}
