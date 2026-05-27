CREATE TABLE "allowed_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "allowed_emails_email_unique" UNIQUE("email")
);

--> statement-breakpoint
ALTER TABLE "allowed_emails" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "allowed_emails_all" ON "allowed_emails" USING (true) WITH CHECK (true);
--> statement-breakpoint
INSERT INTO "allowed_emails" ("email") VALUES ('mrosmarin@gmail.com') ON CONFLICT ("email") DO NOTHING;
