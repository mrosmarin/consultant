"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { timeEntries } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type TimeEntryState = { ok: boolean; error?: string } | null;

export async function addTimeEntry(
  _prev: TimeEntryState,
  formData: FormData,
): Promise<TimeEntryState> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return { ok: false, error: "You're not signed in." };

  const workDate = (formData.get("workDate") as string)?.trim();
  const client = (formData.get("client") as string)?.trim();
  const hoursRaw = (formData.get("hours") as string)?.trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  const hours = Number(hoursRaw);

  if (!workDate || !client || !hoursRaw) {
    return { ok: false, error: "Date, client, and hours are required." };
  }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return { ok: false, error: "Hours must be a number between 0 and 24." };
  }

  await db.insert(timeEntries).values({
    userId: session.user.id,
    workDate,
    client,
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
