"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, projects, PROJECT_STATUSES, type ProjectStatus } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type ProjectState = { ok: boolean; error?: string } | null;

type ParsedProject = {
  companyId: string;
  name: string;
  status: ProjectStatus;
  hourlyRate: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

function parseProject(formData: FormData): { values: ParsedProject } | { error: string } {
  const companyId = (formData.get("companyId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const status = ((formData.get("status") as string)?.trim() || "active") as ProjectStatus;
  const rateRaw = ((formData.get("hourlyRate") as string) ?? "").trim();
  const startDate = ((formData.get("startDate") as string) ?? "").trim() || null;
  const endDate = ((formData.get("endDate") as string) ?? "").trim() || null;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!companyId) return { error: "Pick a company." };
  if (!name) return { error: "Project name is required." };
  if (!PROJECT_STATUSES.includes(status)) return { error: "Invalid status." };

  let hourlyRate: string | null = null;
  if (rateRaw) {
    const rate = Number(rateRaw);
    if (!Number.isFinite(rate) || rate < 0) {
      return { error: "Hourly rate must be a non-negative number." };
    }
    hourlyRate = rate.toFixed(2);
  }
  if (startDate && endDate && endDate < startDate) {
    return { error: "End date can't be before the start date." };
  }

  return { values: { companyId, name, status, hourlyRate, startDate, endDate, notes } };
}

// Verify the company belongs to the signed-in user (not soft-deleted).
async function ownsCompany(userId: string, companyId: string): Promise<boolean> {
  const [c] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(eq(companies.id, companyId), eq(companies.userId, userId), isNull(companies.deletedAt)),
    )
    .limit(1);
  return Boolean(c);
}

export async function saveProject(_prev: ProjectState, formData: FormData): Promise<ProjectState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const parsed = parseProject(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  if (!(await ownsCompany(session.user.id, parsed.values.companyId))) {
    return { ok: false, error: "Pick one of your companies." };
  }

  const id = ((formData.get("id") as string) ?? "").trim();
  if (id) {
    await db
      .update(projects)
      .set(parsed.values)
      .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)));
    revalidatePath("/account/projects");
    redirect("/account/projects");
  }

  await db.insert(projects).values({ userId: session.user.id, ...parsed.values });
  revalidatePath("/account/projects");
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteProject(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = formData.get("id") as string;
  if (!id) return;

  await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)));
  revalidatePath("/account/projects");
  revalidatePath("/account");
}
