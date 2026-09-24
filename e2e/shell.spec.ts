import { test, expect } from "@playwright/test";

// Phase 1 smoke test: the app boots and the base shell (sidebar + topbar)
// renders. Real user journeys (§11 of the implementation plan) have
// consistently been covered via Vitest integration tests against each
// feature's mutations instead of Playwright E2E specs (see plan §40.5) —
// this file stays a plain boot check.
test("dashboard shell renders sidebar and topbar", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Interview Platform" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Positions" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible();
});
