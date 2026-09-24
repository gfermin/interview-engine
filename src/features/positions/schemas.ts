import { z } from "zod";

// Role Family / Seniority are intentionally free text (plan §39.3) — the
// suggestion lists in src/lib/reference-data.ts seed an autocomplete UI but
// never constrain what can be typed here.
// Empty optional fields normalize to `null` (not `undefined`) so an update
// that clears a field actually sets it to NULL rather than leaving the
// column untouched.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const positionFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  department: optionalText(200),
  roleFamily: optionalText(200),
  seniority: optionalText(100),
});

export type PositionFormValues = z.infer<typeof positionFormSchema>;

export const jobDescriptionFormSchema = z.object({
  rawText: z
    .string()
    .trim()
    .min(20, "Paste the full Job Description text (at least 20 characters)."),
});

export type JobDescriptionFormValues = z.infer<typeof jobDescriptionFormSchema>;
