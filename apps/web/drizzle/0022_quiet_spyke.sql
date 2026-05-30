CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid,
	"expense_date" date NOT NULL,
	"category" text DEFAULT 'Other' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"billable" boolean DEFAULT true NOT NULL,
	"notes" text,
	"receipt_key" text,
	"billed_at" timestamp with time zone,
	"billed_invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "expenses_all" ON "expenses" USING (true) WITH CHECK (true);
