import { test, expect } from "@playwright/test";

// Phase 1 smoke test: the app boots and the base shell (sidebar + topbar)
// renders. Real user journeys (§11 of the implementation plan) land from
// Phase 3 onward once there's a domain to exercise.
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
