import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientContext, getClientInvoices, getClientProjects } from "@/lib/client-data";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ClientDashboard() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/auth/sign-in?reason=auth");
  if (!ctx.company) return null;

  const [invoices, projects] = await Promise.all([
    getClientInvoices(ctx.company.id),
    getClientProjects(ctx.company.id),
  ]);
  const outstanding = invoices.reduce((sum, i) => sum + i.outstanding, 0);
  const openCount = invoices.filter((i) => i.outstanding > 0).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {ctx.company.name}</h1>
        <p className="text-muted-foreground text-sm">
          Your invoices and projects with EndlessWorlds, LLC.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium">Outstanding balance</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-semibold">
            {formatMoney(outstanding, ctx.company.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium">Open invoices</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-semibold">{openCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xl font-semibold">{projects.length}</CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-sm">
        See all your{" "}
        <Link href="/client/invoices" className="text-brand underline">
          invoices
        </Link>{" "}
        and{" "}
        <Link href="/client/projects" className="text-brand underline">
          projects
        </Link>
        .
      </p>
    </div>
  );
}
