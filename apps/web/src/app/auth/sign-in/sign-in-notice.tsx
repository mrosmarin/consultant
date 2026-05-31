"use client";

import { useSearchParams } from "next/navigation";

// Shows a contextual notice on the sign-in page (DEV-69). The portal guard
// redirects unauthenticated navigations here with `?reason=auth`; an explicit
// `?reason=expired` is used where we know the session lapsed.
export function SignInNotice() {
  const reason = useSearchParams().get("reason");
  if (!reason) return null;

  const message =
    reason === "expired"
      ? "Your session has expired — please sign in again."
      : "Please sign in to continue to the portal.";

  return (
    <p className="border-input text-muted-foreground rounded-md border px-3 py-2 text-sm">
      {message}
    </p>
  );
}
