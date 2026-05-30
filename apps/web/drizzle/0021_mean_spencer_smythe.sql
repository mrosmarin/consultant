ALTER TABLE "invoices" ADD COLUMN "public_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_public_token_unique" UNIQUE("public_token");