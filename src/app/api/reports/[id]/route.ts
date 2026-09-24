import { readFile } from "node:fs/promises";
import { getReport } from "@/features/reports/queries";

/** Streams a generated report's PDF bytes for download. The file itself
 * lives on disk (see features/reports/mutations.ts); this route is the only
 * thing that reads it back out, so the UI never needs a direct filesystem
 * path. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) {
    return new Response("Report not found.", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(report.filePath);
  } catch (error) {
    // The DB row can outlive the file (e.g. `.data/reports/` cleared
    // out-of-band) — without this, `readFile`'s ENOENT throws straight to a
    // 500 rather than a clean, actionable 404 (§40.3).
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return new Response("Report file is missing — regenerate it.", { status: 404 });
    }
    throw error;
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="interview-report-${report.id}.pdf"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
