"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUpWithEmail } from "./actions";

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpWithEmail, null);

  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Create account</h1>
      <form action={formAction} style={{ display: "grid", gap: "0.75rem" }}>
        <input name="name" type="text" placeholder="Name" autoComplete="name" required />
        <input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          required
        />
        <button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      {state?.error ? <p style={{ color: "crimson" }}>{state.error}</p> : null}
      <p>
        Have an account? <Link href="/auth/sign-in">Sign in</Link>
      </p>
    </main>
  );
}
