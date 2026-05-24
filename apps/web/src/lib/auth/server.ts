import { createNeonAuth } from "@neondatabase/auth/next/server";

// Server-side Neon Auth instance: use in server components, server actions,
// route handlers, and middleware. Reads NEON_AUTH_BASE_URL + the cookie secret
// from the environment (see apps/web/.env.example).
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
