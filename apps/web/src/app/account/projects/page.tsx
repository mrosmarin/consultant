import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, projects } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { listCompanyOptions } from "@/lib/companies";
import { formatMoney } from "@/lib/money";

import { deleteProject } from "./actions";
import { ProjectForm } from "./project-form";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  await requireAdmin(); // admin-only section -- team members get /forbidden (DEV-141)

  const [companyOptions, rows] = await Promise.all([
    listCompanyOptions(session.user.id),
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        hourlyRate: projects.hourlyRate,
        companyName: companies.name,
        currency: companies.currency,
      })
      .from(projects)
      .leftJoin(companies, eq(projects.companyId, companies.id))
      .where(and(eq(projects.userId, session.user.id), isNull(projects.deletedAt)))
      .orderBy(asc(projects.status), desc(projects.createdAt)),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground text-sm">
          Engagements under a client — log time and bill against them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a project</CardTitle>
        </CardHeader>
        <CardContent>
          {companyOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Onboard a company first on the{" "}
              <Link href="/account/companies" className="text-brand underline">
                Companies
              </Link>{" "}
              page — projects belong to a client.
            </p>
          ) : (
            <ProjectForm companies={companyOptions} />
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">Your projects</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No projects yet — add your first above.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Project</th>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Rate</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="text-muted-foreground px-4 py-2">{r.companyName ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          r.status === "active"
                            ? "text-brand text-xs font-medium"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.hourlyRate
                        ? `${formatMoney(Number(r.hourlyRate), r.currency)}/hr`
                        : "company rate"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/account/projects/${r.id}/edit`}
                          className="text-muted-foreground hover:text-foreground text-xs"
                        >
                          Edit
                        </Link>
                        <form action={deleteProject}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-muted-foreground hover:text-destructive text-xs">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
