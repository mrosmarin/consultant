"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { homePathForRole, roleForEmail } from "@/lib/auth/rbac";

export type AuthFormState = { error: string } | null;

const NOT_ALLOWED = "This email isn't authorized for portal access.";

export async function signInWithEmail(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email") as string;
  if (!email || !(await isEmailAllowed(email))) {
    return { error: NOT_ALLOWED };
  }

  const { error } = await auth.signIn.email({
    email,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message || "Failed to sign in. Try again." };
  }

  // Land each role on its own home: clients → /client, admin/team → /account.
  const role = await roleForEmail(email);
  redirect(role ? homePathForRole(role) : "/account");
}
