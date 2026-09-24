import { eq } from "drizzle-orm";
import { db } from "@/db";
import { positions } from "@/db/schema";
import type { PositionFormValues } from "./schemas";

export async function createPosition(input: PositionFormValues) {
  const [position] = await db.insert(positions).values(input).returning();
  return position;
}

export async function updatePosition(id: string, input: PositionFormValues) {
  const [position] = await db
    .update(positions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(positions.id, id))
    .returning();
  return position;
}
