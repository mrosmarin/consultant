ALTER TABLE "allowed_emails" ADD COLUMN "role" text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "allowed_emails" ADD COLUMN "company_id" uuid;