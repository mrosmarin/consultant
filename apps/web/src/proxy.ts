import { auth } from "@/lib/auth/server";

// Next.js 16 uses proxy.ts (formerly middleware.ts). Protects the portal:
// unauthenticated requests to /account/* are redirected to the sign-in page.
export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: ["/account/:path*"],
};
