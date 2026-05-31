CREATE TABLE "company_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"content_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"storage_key" text NOT NULL,
	"storage_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_blobs" (
	"storage_key" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "company_documents_all" ON "company_documents" USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "document_blobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "document_blobs_all" ON "document_blobs" USING (true) WITH CHECK (true);
