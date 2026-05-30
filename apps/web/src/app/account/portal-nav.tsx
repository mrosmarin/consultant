"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Clock, FileText, FileSignature, FolderKanban, LayoutDashboard, Receipt } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/account/companies", label: "Companies", icon: Building2 },
  { href: "/account/projects", label: "Projects", icon: FolderKanban },
  { href: "/account/timesheets", label: "Timesheets", icon: Clock },
  { href: "/account/quotes", label: "Quotes", icon: FileSignature },
  { href: "/account/invoices", label: "Invoices", icon: FileText },
  { href: "/account/credit-notes", label: "Credit notes", icon: Receipt },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 p-2 md:flex-col md:p-4">
      {ITEMS.map((item) => {
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
