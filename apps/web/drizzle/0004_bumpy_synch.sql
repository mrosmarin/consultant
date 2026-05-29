CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"address" text,
	"notes" text,
	"billing_type" text DEFAULT 'hourly' NOT NULL,
	"hourly_rate" numeric(12, 2),
	"retainer_amount" numeric(12, 2),
	"billing_frequency" text DEFAULT 'monthly' NOT NULL,
	"billing_anchor_day" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "companies_all" ON "companies" USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "client" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "client" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "start_time" time;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "end_time" time;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;