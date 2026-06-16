CREATE TABLE "business_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"legal_name" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text,
	"email" text,
	"phone" text,
	"tax_id" text,
	"bank_name" text,
	"bank_routing" text,
	"bank_account" text,
	"bank_account_name" text,
	"check_payable_to" text,
	"check_mailing_address" text,
	"zelle" text,
	"venmo" text,
	"paypal" text,
	"pay_link_url" text,
	"remit_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "business_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "business_settings_all" ON "business_settings" USING (true) WITH CHECK (true);
