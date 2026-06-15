"use client";

import { useSearchParams } from "next/navigation";

// Shows a contextual notice on the sign-in page (DEV-69). The portal guard
// redirects unauthenticated navigations here with `?reason=auth`; an explicit
// `?reason=expired` is used where we know the session lapsed; `?reason=reset`
// confirms a completed password reset (DEV-147).
const MESSAGES: Record<string, string> = {
  expired: "Your session has expired — please sign in again.",
  reset: "Your password has been updated — sign in with your new password.",
  auth: "Please sign in to continue to the portal.",
};

export function SignInNotice() {
  const reason = useSearchParams().get("reason");
  if (!reason) return null;

  const message = MESSAGES[reason] ?? MESSAGES.auth;

  return (
    <p className="border-input text-muted-foreground rounded-md border px-3 py-2 text-sm">
      {message}
    </p>
  );
}
