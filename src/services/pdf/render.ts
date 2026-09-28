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
  try {
    const browser = await chromium.launch();
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
  } catch (error) {
    throw curatePlaywrightError(error);
  }
}

/** Rewrites the handful of Playwright failure signatures an interviewer
 * could plausibly hit (plan Phase 30/AUDIT-015, L-15) into plain language,
 * covering the whole render (launch, setContent, and pdf() can each raise
 * their own version of these), rather than only the original "binary not
 * installed" special-case at launch. Anything unanticipated still falls
 * back to the raw error rather than being swallowed. */
function curatePlaywrightError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("PDF generation failed unexpectedly — try again.");
  }
  if (/Executable doesn't exist/.test(error.message)) {
    return new Error("PDF engine not installed — run `npx playwright install chromium` and try again.");
  }
  if (/Timeout\s+\d+ms exceeded/i.test(error.message)) {
    return new Error(
      "PDF generation timed out — try again; if this keeps happening, the report content may be unusually large."
    );
  }
  if (/crashed|target (page|context|browser).*closed|has been closed/i.test(error.message)) {
    return new Error("The PDF engine closed unexpectedly — try again.");
  }
  return error;
}
