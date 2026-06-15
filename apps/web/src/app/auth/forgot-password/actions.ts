"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth/server";

export type ForgotPasswordState = { ok: true } | { error: string } | null;

// Request a password-reset email. Neon Auth's managed service sends the email
// (no Resend dependency). We always report the same generic success regardless
// of whether the account exists, to avoid leaking which emails are registered.
export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formData.get("email") as string;
  if (!email) {
    return { error: "Enter the email address for your account." };
  }

  // Derive the reset link's origin from the request so it's correct per
  // environment (staging → staging, prod → prod) rather than a static URL.
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const redirectTo = `${proto}://${host}/auth/reset-password`;

  try {
    await auth.requestPasswordReset({ email, redirectTo });
  } catch {
    // Swallow — never reveal whether the email is registered. The user always
    // sees the same "check your email" confirmation.
  }

  return { ok: true };
}
