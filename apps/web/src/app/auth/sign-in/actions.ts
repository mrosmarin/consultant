"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

export type AuthFormState = { error: string } | null;

export async function signInWithEmail(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { error } = await auth.signIn.email({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message || "Failed to sign in. Try again." };
  }

  redirect("/account");
}
