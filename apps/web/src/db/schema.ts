import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// Contact / lead-capture submissions from the public site.
// RLS is enabled with a public-insert policy in the migration (project rule:
// RLS on every table). Reads are owner/admin-only until the portal adds a
// restricted role.
export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
