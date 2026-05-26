import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  const name = session?.user?.name || session?.user?.email || "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back, {name}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Hours this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-3xl font-semibold">0</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Open invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-3xl font-semibold">0</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/account/timesheets">
            <Plus className="size-4" /> Log time
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/account/invoices">
            <Plus className="size-4" /> New invoice
          </Link>
        </Button>
      </div>
    </div>
  );
}
