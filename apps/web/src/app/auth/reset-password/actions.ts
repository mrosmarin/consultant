"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { validatePassword } from "@/lib/auth/password";

export type ResetPasswordState = { error: string } | null;

// Complete a password reset using the token from the emailed link. The token
// comes from a hidden field populated from the URL on the reset page.
export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = formData.get("token") as string;
  if (!token) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const { error } = await auth.resetPassword({ newPassword: password, token });
  if (error) {
    return {
      error:
        error.message ||
        "Couldn't reset your password. The link may have expired — request a new one.",
    };
  }

  // Success — send them to sign in with a confirmation notice.
  redirect("/auth/sign-in?reason=reset");
}
