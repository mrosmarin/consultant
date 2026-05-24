import { auth } from "@/lib/auth/server";

// Neon Auth catch-all route handler (sign-in/up/out, session, callbacks).
export const { GET, POST } = auth.handler();
