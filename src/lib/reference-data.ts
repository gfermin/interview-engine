// Application-layer suggestion lists for Position.roleFamily / Position.seniority
// (plan §39.3). Deliberately NOT a DB enum — these seed an editable-combobox
// UI (native <input list=...> autocomplete) so a discipline or seniority
// ladder outside this list is never blocked, only unassisted.

export const ROLE_FAMILY_SUGGESTIONS = [
  "Software Engineering",
  "Quality Assurance",
  "DevOps / Platform Engineering",
  "Site Reliability Engineering",
  "Data Engineering",
  "AI / Machine Learning",
  "Product / Delivery",
  "Design",
  "Human Resources / Recruiting",
  "Finance",
  "Sales",
  "Operations",
  "Marketing",
] as const;

export const SENIORITY_SUGGESTIONS = [
  "Entry",
  "Junior",
  "Mid-Level",
  "Senior",
  "Lead",
  "Staff",
  "Principal",
  "Manager",
  "Senior Manager",
  "Director",
] as const;
