import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { projects } from "@/db/schema";

export type ProjectOption = { id: string; name: string; companyId: string };

// Active (non-deleted) projects owned by the user, for the timesheet picker.
// Includes companyId so the client can filter to the selected company.
export async function listProjectOptions(userId: string): Promise<ProjectOption[]> {
  return db
    .select({ id: projects.id, name: projects.name, companyId: projects.companyId })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        eq(projects.status, "active"),
      ),
    )
    .orderBy(asc(projects.name));
}
