import { redirect } from "next/navigation";

import { getClientContext, getClientProjects } from "@/lib/client-data";

export const dynamic = "force-dynamic";

export default async function ClientProjectsPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/auth/sign-in?reason=auth");
  if (!ctx.company) return null;

  const projects = await getClientProjects(ctx.company.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground text-sm">Your projects with EndlessWorlds, LLC.</p>
      </div>

      {projects.length === 0 ? (
        <p className="text-muted-foreground text-sm">No projects yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Start</th>
                <th className="px-4 py-2 font-medium">End</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{p.name}</td>
                  <td className="px-4 py-2 capitalize">{p.status}</td>
                  <td className="px-4 py-2">{p.startDate ?? "—"}</td>
                  <td className="px-4 py-2">{p.endDate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
