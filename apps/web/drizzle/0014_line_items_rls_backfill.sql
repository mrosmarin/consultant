-- DEV-115 follow-up: RLS + backfill for invoice_line_items (the 0013 table-create
-- shipped without them). Idempotent backfill so it's safe across all envs.
ALTER TABLE "invoice_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "invoice_line_items_all" ON "invoice_line_items" USING (true) WITH CHECK (true);--> statement-breakpoint
INSERT INTO "invoice_line_items" ("user_id", "invoice_id", "description", "quantity", "unit_amount", "line_total", "sort_order")
SELECT i."user_id", i."id", COALESCE(NULLIF(i."notes", ''), 'Invoice ' || i."invoice_number"), 1, i."amount", i."amount", 0
FROM "invoices" i
WHERE i."deleted_at" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "invoice_line_items" li WHERE li."invoice_id" = i."id");
