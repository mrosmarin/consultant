ALTER TABLE "companies" ADD COLUMN "tax_rate" numeric(6, 3);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tax_label" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tax_exempt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "subtotal" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_rate" numeric(6, 3);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_label" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_amount" numeric(12, 2);--> statement-breakpoint
-- Backfill: existing (pre-tax) invoices have subtotal = amount and zero tax,
-- so amount = subtotal + tax_amount holds. tax_rate/tax_label stay null.
UPDATE "invoices" SET "subtotal" = "amount", "tax_amount" = 0 WHERE "subtotal" IS NULL;