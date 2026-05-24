// Drizzle schema for the Neon Postgres database.
//
// Define tables here, then run `pnpm --filter web db:generate` to create a
// migration and `db:migrate` to apply it. Every table must enable RLS
// (project rule). Neon Auth manages its own users in the `neon_auth` schema
// (see DEV-85) — reference it from app tables rather than recreating users.
//
// Example:
//   import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
//   export const leads = pgTable("leads", {
//     id: uuid("id").defaultRandom().primaryKey(),
//     email: text("email").notNull(),
//     createdAt: timestamp("created_at").defaultNow().notNull(),
//   });

export {};
