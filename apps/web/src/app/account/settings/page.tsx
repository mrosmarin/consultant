import { requireAdmin } from "@/lib/auth/rbac";
import { getBusinessSettings } from "@/lib/business-settings";

import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const settings = await getBusinessSettings(admin.user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business settings</h1>
        <p className="text-muted-foreground text-sm">
          Your business details and how clients pay you. These appear on every
          invoice, quote, and credit note so recipients know who and how to pay.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
