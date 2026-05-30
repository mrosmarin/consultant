ALTER TABLE "time_entries" ADD COLUMN "project_id" uuid;--> statement-breakpoint
-- RLS for the projects table (0006 created the table without it).
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "projects_all" ON "projects" USING (true) WITH CHECK (true);