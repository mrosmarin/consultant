CREATE TABLE "company_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"invoiced_invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "company_milestones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "company_milestones_all" ON "company_milestones" USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "fixed_amount" numeric(12, 2);