CREATE TABLE "company_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "company_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "company_contacts_all" ON "company_contacts" USING (true) WITH CHECK (true);--> statement-breakpoint
-- Backfill the legacy single contact on each company as its primary contact.
INSERT INTO "company_contacts" ("user_id", "company_id", "name", "email", "is_primary")
SELECT "user_id", "id", COALESCE("contact_name", "contact_email"), "contact_email", true
FROM "companies"
WHERE "deleted_at" IS NULL AND ("contact_name" IS NOT NULL OR "contact_email" IS NOT NULL);
