import { pgTable, uuid, text, timestamp, date, numeric } from "drizzle-orm/pg-core";

// Contact / lead-capture submissions from the public site.
// RLS enabled with a public-insert policy in the migration.
export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Portal time tracking. Ownership is enforced app-side (where user_id =
// session.user.id); RLS is enabled as a backstop. user_id holds the Neon
// Auth user id (no hard FK into the neon_auth schema).
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  workDate: date("work_date").notNull(),
  client: text("client").notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
