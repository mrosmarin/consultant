"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// Client-side Neon Auth: talks to the same-origin /api/auth/* route handler.
export const authClient = createAuthClient();
