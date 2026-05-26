"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";

export type ContactState = { ok: boolean; error?: string } | null;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function submitLead(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const company = ((formData.get("company") as string) ?? "").trim() || null;
  const message = (formData.get("message") as string)?.trim();

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in your name, email, and a message." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  try {
    await db.insert(leads).values({ name, email, company, message });
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Something went wrong sending your message. Please email hello@endlessworlds.xyz.",
    };
  }
}
