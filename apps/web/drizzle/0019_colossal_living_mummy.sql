ALTER TABLE "invoices" ADD COLUMN "type" text DEFAULT 'invoice' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "valid_until" date;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "source_quote_id" uuid;