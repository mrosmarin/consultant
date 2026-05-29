import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth/server";

// Next.js 16 uses proxy.ts (formerly middleware.ts). Protects the portal:
// unauthenticated page navigations to /account/* are redirected to the sign-in page.
const guard = auth.middleware({
  loginUrl: "/auth/sign-in",
});

// React server actions (form submits via useActionState) POST to these same
// /account/* paths. The auth guard answers an unauthenticated request with a 307
// to the sign-in HTML page — fine for a page navigation, but for a server action
// that redirect is handed back to React's action dispatcher, which can't parse it
// and throws "An unexpected response was received from the server" (no server-side
// error is logged). So we must NOT run the redirecting guard for action POSTs.
//
// Every portal mutation is a POST, and the only POST handlers under /account are
// server actions, which already enforce auth themselves: each calls
// auth.getSession() and bails (returns an error state) when there's no session.
// So we let all non-GET requests through and keep the redirect guard for page
// navigations (GET). This covers both the JS path (Next-Action header) and the
// no-JS progressive-enhancement form POST.
export default function proxy(request: NextRequest) {
  if (request.method !== "GET") {
    return NextResponse.next();
  }
  return guard(request);
}

export const config = {
  matcher: ["/account/:path*"],
};
