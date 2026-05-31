import { renderToBuffer } from "@react-pdf/renderer";

import { auth } from "@/lib/auth/server";
import { TimesheetPdf } from "@/lib/pdf/timesheet-pdf";
import { buildTimesheetReport } from "@/lib/reports";
import {
  fetchTimesheetRows,
  parseTimesheetFilters,
} from "@/lib/timesheet-report-query";

// Branded, client-ready timesheet PDF with the page filters applied (DEV-74).
// Authenticated, owner-scoped — reuses the shared query + report builder so the
// PDF matches the on-screen report exactly.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const filters = parseTimesheetFilters(sp);
  const entries = await fetchTimesheetRows(session.user.id, filters);
  const report = buildTimesheetReport(entries);

  // Name the client only when the report is scoped to a single company.
  const clientName = filters.companyId ? (entries[0]?.companyName ?? null) : null;

  const buffer = await renderToBuffer(
    TimesheetPdf({
      data: {
        report,
        entries,
        range: { from: filters.from ?? null, to: filters.to ?? null },
        clientName,
      },
    }),
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="timesheet.pdf"`,
    },
  });
}
