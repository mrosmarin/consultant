import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { listCompanyOptions } from "@/lib/companies";

import { ProjectForm } from "../../project-form";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const [companyOptions, [project]] = await Promise.all([
    listCompanyOptions(session.user.id),
    db
      .select()
      .from(projects)
      .where(
        and(eq(projects.id, id), eq(projects.userId, session.user.id), isNull(projects.deletedAt)),
      )
      .limit(1),
  ]);

  if (!project) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/account/projects"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-muted-foreground text-sm">Edit project details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            companies={companyOptions}
            project={{
              id: project.id,
              companyId: project.companyId,
              name: project.name,
              status: project.status,
              hourlyRate: project.hourlyRate,
              startDate: project.startDate,
              endDate: project.endDate,
              notes: project.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
