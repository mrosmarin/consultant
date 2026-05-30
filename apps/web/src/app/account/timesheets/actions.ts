"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { companies, projects, timeEntries } from "@/db/schema";
import { auth } from "@/lib/auth/server";

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
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const workDate = (formData.get("workDate") as string)?.trim();
  const companyId = ((formData.get("companyId") as string) ?? "").trim();
  const projectId = ((formData.get("projectId") as string) ?? "").trim() || null;
  const startTime = ((formData.get("startTime") as string) ?? "").trim() || null;
  const endTime = ((formData.get("endTime") as string) ?? "").trim() || null;
  const hoursRaw = ((formData.get("hours") as string) ?? "").trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!workDate || !companyId) {
    return { ok: false, error: "Date and company are required." };
  }

  // Verify the company is one the signed-in user owns (not soft-deleted).
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(
        eq(companies.id, companyId),
        eq(companies.userId, session.user.id),
        isNull(companies.deletedAt),
      ),
    )
    .limit(1);
  if (!company) return { ok: false, error: "Pick one of your companies." };

  // Optional project must be the user's and belong to the chosen company.
  if (projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.userId, session.user.id),
          eq(projects.companyId, companyId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);
    if (!project) return { ok: false, error: "Pick a project under the selected company." };
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

  await db.insert(timeEntries).values({
    userId: session.user.id,
    companyId,
    projectId,
    workDate,
    startTime,
    endTime,
    hours: hours.toFixed(2),
    notes,
  });
  revalidatePath("/account/timesheets");
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteTimeEntry(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return;
  const id = formData.get("id") as string;
  if (!id) return;

  await db
    .update(timeEntries)
    .set({ deletedAt: new Date() })
    .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, session.user.id)));
  revalidatePath("/account/timesheets");
  revalidatePath("/account");
}
