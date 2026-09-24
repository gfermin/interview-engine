import { z } from "zod";

// Empty optional fields normalize to `null` (not `undefined`), matching the
// positions feature's convention (src/features/positions/schemas.ts) — an
// update that clears a field actually sets it to NULL rather than leaving
// the column untouched.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Enter a valid email address.",
  });

export const candidateFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: optionalEmail,
  notes: optionalText(2000),
});

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;

export const startSessionFormSchema = z.object({
  templateId: z.string().trim().min(1, "Select a published template."),
});

export type StartSessionFormValues = z.infer<typeof startSessionFormSchema>;
