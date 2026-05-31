"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, projects, timeEntries } from "@/db/schema";
import { getAccess, getTenantOwnerId } from "@/lib/auth/rbac";

export type TimeEntryState = { ok: boolean; error?: string } | null;

// Compute hours from two "HH:MM" clock times; null if invalid or non-positive.
function hoursBetween(start: string, end: string): number | null {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return null;
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return null;
  return mins / 60;
}

export async function addTimeEntry(
  _prev: TimeEntryState,
  formData: FormData,
): Promise<TimeEntryState> {
  // Admins and team members may log time. The entry is OWNED by the tenant
  // (user_id = the consultant) so it rolls into the tenant's timesheet +
  // invoicing; logged_by records who physically entered it (DEV-141).
  const access = await getAccess();
  if (!access) return { ok: false, error: "You're not signed in." };
  if (access.role === "client") return { ok: false, error: "Not permitted." };
  const ownerId = await getTenantOwnerId(access);

  const workDate = (formData.get("workDate") as string)?.trim();
  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  const projectId = ((formData.get("projectId") as string) ?? "").trim() || null;
  const task = ((formData.get("task") as string) ?? "").trim() || null;
  const startTime = ((formData.get("startTime") as string) ?? "").trim() || null;
  const endTime = ((formData.get("endTime") as string) ?? "").trim() || null;
  const hoursRaw = ((formData.get("hours") as string) ?? "").trim();
  const rateRaw = ((formData.get("rate") as string) ?? "").trim();
  const billable = formData.get("billable") === "true";
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!workDate || !companyId) {
    return { ok: false, error: "Date and company are required." };
  }

  // Verify the company belongs to the tenant (not soft-deleted).
  const [company] = await db
    .select({
      id: companies.id,
      billingType: companies.billingType,
      hourlyRate: companies.hourlyRate,
    })
    .from(companies)
    .where(
      and(eq(companies.id, companyId), eq(companies.userId, ownerId), isNull(companies.deletedAt)),
    )
    .limit(1);
  if (!company) return { ok: false, error: "Pick one of your companies." };

  // Optional project must be the tenant's and belong to the chosen company.
  // Its rate (if set) overrides the company rate.
  let projectRate: string | null = null;
  if (projectId) {
    const [project] = await db
      .select({ id: projects.id, hourlyRate: projects.hourlyRate })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.userId, ownerId),
          eq(projects.companyId, companyId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);
    if (!project) return { ok: false, error: "Pick a project under the selected company." };
    projectRate = project.hourlyRate;
  }

  // Hours come from the explicit field, or are derived from start/end times.
  let hours: number;
  if (hoursRaw) {
    hours = Number(hoursRaw);
  } else if (startTime && endTime) {
    const derived = hoursBetween(startTime, endTime);
    if (derived === null) {
      return { ok: false, error: "End time must be after start time." };
    }
    hours = derived;
  } else {
    return { ok: false, error: "Enter hours, or both a start and end time." };
  }

  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return { ok: false, error: "Hours must be between 0 and 24." };
  }
  if ((startTime && !endTime) || (!startTime && endTime)) {
    return { ok: false, error: "Provide both a start and end time, or neither." };
  }

  // Effective rate, snapshotted at log time: explicit override → project rate →
  // company rate. Null for retainer companies (time is tracked, not rate-billed).
  let rate: string | null = null;
  if (rateRaw) {
    const r = Number(rateRaw);
    if (!Number.isFinite(r) || r < 0) {
      return { ok: false, error: "Rate must be a non-negative number." };
    }
    rate = r.toFixed(2);
  } else if (company.billingType === "hourly") {
    const resolved = projectRate ?? company.hourlyRate;
    rate = resolved ? Number(resolved).toFixed(2) : null;
  }

  await db.insert(timeEntries).values({
    userId: ownerId,
    loggedBy: access.user.id,
    companyId,
    projectId,
    task,
    workDate,
    startTime,
    endTime,
    hours: hours.toFixed(2),
    rate,
    billable,
    notes,
  });
  revalidatePath("/account/timesheets");
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteTimeEntry(formData: FormData): Promise<void> {
  const access = await getAccess();
  if (!access || access.role === "client") return;
  const id = formData.get("id") as string;
  if (!id) return;

  // Admins can delete any of the tenant's entries; team members only the ones
  // they logged themselves.
  const scope =
    access.role === "team_member"
      ? eq(timeEntries.loggedBy, access.user.id)
      : eq(timeEntries.userId, access.user.id);

  await db
    .update(timeEntries)
    .set({ deletedAt: new Date() })
    .where(and(eq(timeEntries.id, id), scope));
  revalidatePath("/account/timesheets");
  revalidatePath("/account");
}
