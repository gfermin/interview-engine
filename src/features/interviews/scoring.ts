import { calculate } from "@/domain/scoring";
import type {
  MandatoryRequirementEvaluationInput,
  ScoringResult,
  SupplementaryGateConfig,
  SupplementaryGateResult,
} from "@/domain/scoring/types";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { getTemplate, listCompetencies, listMandatoryRequirements } from "@/features/templates/queries";
import {
  buildSessionEvaluationState,
  getSupplementaryAssessment,
  listMandatoryRequirementEvaluations,
} from "./queries";

/**
 * Gathers everything a session's `InterviewTemplate` version has authored
 * (Competencies, MandatoryRequirements, ScoringConfiguration, the English
 * gate) plus everything the interviewer has recorded against it (question
 * ratings, mandatory-requirement statuses, the English level) and runs it
 * through the unmodified Phase 2 `ScoringEngine.calculate()` — this is the
 * one place Phase 9's Summary screen and its decision-recording mutation
 * both call, so they can never see two different calculated results for
 * the same session state.
 */
export async function computeFullScoringResult(sessionId: string, templateId: string): Promise<ScoringResult> {
  const template = await getTemplate(templateId);
  if (!template) throw new Error("Template not found.");

  const [competencies, mandatoryReqs, { evaluationInputs }, mrEvaluationRows, englishAssessment] =
    await Promise.all([
      listCompetencies(templateId),
      listMandatoryRequirements(templateId),
      buildSessionEvaluationState(templateId, sessionId),
      listMandatoryRequirementEvaluations(sessionId),
      getSupplementaryAssessment(sessionId, "english"),
    ]);

  const mandatoryRequirementEvaluationInputs: MandatoryRequirementEvaluationInput[] = mrEvaluationRows.map(
    (row) => ({ requirementId: row.requirementId, status: row.status })
  );

  const stageConfig = getStageConfig(template.stage as InterviewStage);
  const supplementaryGates: SupplementaryGateConfig[] = stageConfig.modules.supplementaryAssessments
    ? [{ id: "english", required: template.englishRequired, minLevel: template.englishMinLevel }]
    : [];
  const supplementaryResults: SupplementaryGateResult[] = [
    { id: "english", level: englishAssessment?.level ?? null },
  ];

  return calculate({
    competencies,
    questionEvaluations: evaluationInputs,
    mandatoryRequirements: mandatoryReqs,
    mandatoryRequirementEvaluations: mandatoryRequirementEvaluationInputs,
    supplementaryGates,
    supplementaryResults,
    config: {
      passThreshold: template.passThreshold,
      borderlineMin: template.borderlineMin,
      criticalMin: template.criticalMin,
      minCompletion: template.minCompletion,
    },
  });
}
