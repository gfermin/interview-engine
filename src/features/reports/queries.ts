import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { interviewReports } from "@/db/schema";

export function listReportsForSession(sessionId: string) {
  return db.query.interviewReports.findMany({
    where: eq(interviewReports.sessionId, sessionId),
    orderBy: [desc(interviewReports.createdAt)],
  });
}

export function getReport(id: string) {
  return db.query.interviewReports.findFirst({ where: eq(interviewReports.id, id) });
}
