import { redirect } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { companies, expenses, projects } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { listCompanyOptions } from "@/lib/companies";
import { formatMoney } from "@/lib/money";

import { deleteExpense } from "./actions";
import { AddExpenseForm } from "./add-expense-form";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  await requireAdmin(); // admin-only section -- team members get /forbidden (DEV-141)

  const [companyOptions, projectRows, rows] = await Promise.all([
    listCompanyOptions(session.user.id),
    db
      .select({ id: projects.id, name: projects.name, companyId: projects.companyId })
      .from(projects)
      .where(and(eq(projects.userId, session.user.id), isNull(projects.deletedAt)))
      .orderBy(asc(projects.name)),
    db
      .select({
        id: expenses.id,
        expenseDate: expenses.expenseDate,
        category: expenses.category,
        amount: expenses.amount,
        distance: expenses.distance,
        unitRate: expenses.unitRate,
        billable: expenses.billable,
        notes: expenses.notes,
        billedAt: expenses.billedAt,
        companyName: companies.name,
        currency: companies.currency,
      })
      .from(expenses)
      .leftJoin(companies, eq(expenses.companyId, companies.id))
      .where(and(eq(expenses.userId, session.user.id), isNull(expenses.deletedAt)))
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt)),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground text-sm">
          Log client expenses; billable ones roll into the company&apos;s next invoice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log expense</CardTitle>
        </CardHeader>
        <CardContent>
          <AddExpenseForm companies={companyOptions} projects={projectRows} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-medium">All expenses</h2>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No expenses yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Company</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Billable</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.expenseDate}</td>
                    <td className="px-4 py-2">
                      {r.companyName ?? "—"}
                      {r.notes ? <span className="text-muted-foreground block text-xs">{r.notes}</span> : null}
                    </td>
                    <td className="px-4 py-2">
                      {r.category}
                      {r.category === "Mileage" && r.distance != null && r.unitRate != null ? (
                        <span className="text-muted-foreground block text-xs">
                          {Number(r.distance)} mi @ ${Number(r.unitRate)}/mi
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatMoney(Number(r.amount), r.currency)}
                    </td>
                    <td className="px-4 py-2">
                      {r.billable ? (
                        r.billedAt ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">billed</span>
                        ) : (
                          <span className="text-brand text-xs font-medium">unbilled</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">non-billable</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.billedAt ? null : (
                        <form action={deleteExpense}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-muted-foreground hover:text-destructive text-xs">Delete</button>
                        </form>
                      )}
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
