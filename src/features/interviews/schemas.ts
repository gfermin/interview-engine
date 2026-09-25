import { z } from "zod";

/**
 * Loose shape validation only — the actual business rules (a reason is
 * required for override/forced_call, a forced call needs an explicit
 * PASS/FAIL choice) live in the pure decision state machine
 * (`domain/interviews/decision.ts`) and are enforced by `recordDecision`
 * itself, matching the plan's "AI never decides PASS/FAIL, the engine
 * does" principle applied to validation too: one source of truth, not a
 * duplicate copy in the form schema.
 */
export const decisionFormSchema = z.object({
  mode: z.enum(["accept", "override", "forced_call"]),
  forcedChoice: z.enum(["PASS", "FAIL"]).optional(),
  reason: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type DecisionFormValues = z.infer<typeof decisionFormSchema>;
