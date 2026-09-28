// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const launchMock = vi.hoisted(() => vi.fn());
vi.mock("playwright", () => ({ chromium: { launch: launchMock } }));

const { renderHtmlToPdf } = await import("./render");

beforeEach(() => {
  launchMock.mockReset();
});

// Plan Phase 30/AUDIT-015/L-15 — a Playwright render-time failure other than
// "binary not installed" previously surfaced whatever the SDK/browser
// happened to throw, verbatim. These cover the other common signatures.
describe("renderHtmlToPdf error curation", () => {
  it("maps a page.pdf() timeout to a plain-language message", async () => {
    launchMock.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockRejectedValue(new Error("page.pdf: Timeout 30000ms exceeded.")),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    });

    await expect(renderHtmlToPdf("<html></html>")).rejects.toThrow(/timed out/i);
  });

  it("maps a crashed-page failure to a plain-language message", async () => {
    launchMock.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockRejectedValue(new Error("Page crashed!")),
        pdf: vi.fn(),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    });

    await expect(renderHtmlToPdf("<html></html>")).rejects.toThrow(/closed unexpectedly/i);
  });

  it("still maps the 'Executable doesn't exist' launch failure to the install instruction", async () => {
    launchMock.mockRejectedValueOnce(
      new Error("browserType.launch: Executable doesn't exist at /some/path/chrome")
    );

    await expect(renderHtmlToPdf("<html></html>")).rejects.toThrow(/npx playwright install chromium/);
  });

  it("passes through an unanticipated error unchanged rather than swallowing it", async () => {
    launchMock.mockRejectedValueOnce(new Error("some completely novel failure mode"));

    await expect(renderHtmlToPdf("<html></html>")).rejects.toThrow("some completely novel failure mode");
  });

  it("still returns real PDF bytes on success", async () => {
    launchMock.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 fake")),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    });

    const pdf = await renderHtmlToPdf("<html></html>");
    expect(pdf.toString()).toContain("%PDF-1.4");
  });
});
