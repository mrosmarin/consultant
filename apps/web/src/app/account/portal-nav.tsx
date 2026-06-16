"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, Building2, Clock, CreditCard, FileText, FileSignature, FolderKanban, LayoutDashboard, Receipt, Settings, ShieldCheck, TrendingUp } from "lucide-react";

import type { Role } from "@/db/schema";
import { cn } from "@/lib/utils";

// `roles` restricts an item to those roles; omit it to show for everyone in the
// /account portal. Team-member section gating lands in DEV-141.
const ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; roles?: Role[] }[] = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/account/companies", label: "Companies", icon: Building2 },
  { href: "/account/projects", label: "Projects", icon: FolderKanban },
  { href: "/account/timesheets", label: "Timesheets", icon: Clock },
  { href: "/account/expenses", label: "Expenses", icon: CreditCard },
  { href: "/account/quotes", label: "Quotes", icon: FileSignature },
  { href: "/account/invoices", label: "Invoices", icon: FileText },
  { href: "/account/payments", label: "Payments", icon: Banknote },
  { href: "/account/credit-notes", label: "Credit notes", icon: Receipt },
  { href: "/account/reports", label: "Reports", icon: TrendingUp },
  { href: "/account/access", label: "Access", icon: ShieldCheck, roles: ["admin"] },
  { href: "/account/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function PortalNav({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 p-2 md:flex-col md:p-4">
      {ITEMS.filter((item) =>
        role === "team_member"
          ? item.href === "/account/timesheets"
          : !item.roles || item.roles.includes(role),
      ).map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
