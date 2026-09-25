import { chromium } from "playwright";

/**
 * Renders a self-contained HTML string to PDF bytes via headless Chromium
 * (ADR-007) — never a screenshot of the live UI. A fresh browser is
 * launched per call rather than kept warm across requests: report
 * generation is a rare, deliberate action (one per finalized session, not a
 * hot path), so the simplicity of "launch, render, close" outweighs the
 * cost of skipping a long-lived browser instance for a local single-user
 * POC tool.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchChromium();
  try {
    const page = await browser.newPage();
    // "networkidle" would wait on nothing here — the template has no
    // external resources by design (plan §27: PDF generation has zero
    // network dependency, unlike the AI-assisted steps).
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

/** Wraps `chromium.launch()` to turn Playwright's own "Executable doesn't
 * exist at ..." message (§40.2) — a multi-line dump pointing at a binary
 * path — into the same setup-step instruction the README's Getting Started
 * section already gives (`npx playwright install chromium`), rather than
 * letting that raw message reach the interviewer verbatim. */
async function launchChromium() {
  try {
    return await chromium.launch();
  } catch (error) {
    if (error instanceof Error && /Executable doesn't exist/.test(error.message)) {
      throw new Error(
        "PDF engine not installed — run `npx playwright install chromium` and try again."
      );
    }
    throw error;
  }
}
