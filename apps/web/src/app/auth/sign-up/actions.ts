"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { homePathForRole, roleForEmail } from "@/lib/auth/rbac";
import { validatePassword } from "@/lib/auth/password";
import type { AuthFormState } from "@/app/auth/sign-in/actions";

export async function signUpWithEmail(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email") as string;
  if (!email) {
    return { error: "Email address must be provided." };
  }
  if (!(await isEmailAllowed(email))) {
    return { error: "This email isn't authorized for portal access." };
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

  const { error } = await auth.signUp.email({
    email,
    name: formData.get("name") as string,
    password,
  });

  if (error) {
    return { error: error.message || "Failed to create account." };
  }

  const role = await roleForEmail(email);
  redirect(role ? homePathForRole(role) : "/account");
}
