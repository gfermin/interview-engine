// Plan Phase 21/§42: the INTERVIEW language (what questions/expected
// answers/rubrics are written in) is an explicit InterviewTemplate field,
// independent of the APPLICATION language (lib/i18n.ts). Set once at
// template creation, alongside `stage` — neither has an update mutation
// (see features/templates/mutations.ts: only scoring config is editable in
// place), so `interviewLanguage` follows the same "fixed defining
// characteristic, carried forward unchanged by createNewTemplateVersion"
// treatment `stage` already gets, rather than inventing a new
// editable-after-creation pattern that doesn't exist for stage/name either.
export const INTERVIEW_LANGUAGES = ["en", "es"] as const;

export type InterviewLanguage = (typeof INTERVIEW_LANGUAGES)[number];

export const INTERVIEW_LANGUAGE_LABELS: Record<InterviewLanguage, string> = {
  en: "English",
  es: "Español",
};
