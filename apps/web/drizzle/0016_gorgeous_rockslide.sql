ALTER TABLE "invoices" ADD COLUMN "discount_type" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_value" numeric(12, 3);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_amount" numeric(12, 2);--> statement-breakpoint
-- Backfill: existing invoices have no discount, so amount = subtotal + tax holds.
UPDATE "invoices" SET "discount_amount" = 0 WHERE "discount_amount" IS NULL;