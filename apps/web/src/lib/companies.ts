import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies } from "@/db/schema";

export type CompanyOption = { id: string; name: string };

// Active (non-deleted) companies owned by the user, for picker dropdowns on the
// timesheet and invoice forms. Fetched server-side and passed to the client forms.
export async function listCompanyOptions(userId: string): Promise<CompanyOption[]> {
  return db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(and(eq(companies.userId, userId), isNull(companies.deletedAt)))
    .orderBy(asc(companies.name));
}
