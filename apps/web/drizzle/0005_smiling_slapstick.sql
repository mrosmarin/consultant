ALTER TABLE "companies" ADD COLUMN "invoice_prefix" text;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "billed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "billed_invoice_id" uuid;