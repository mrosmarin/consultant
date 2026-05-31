import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

import { formatMoney } from "@/lib/money";
import { type TimesheetInput, type TimesheetReport } from "@/lib/reports";

// Branded, client-ready timesheet PDF (DEV-74). Pure @react-pdf/renderer — renders
// in a Node route handler. Mirrors invoice-pdf's EndlessWorlds header/footer so the
// delivered document looks consistent.

export type TimesheetPdfData = {
  report: TimesheetReport;
  entries: TimesheetInput[];
  range: { from: string | null; to: string | null };
  clientName: string | null; // set when filtered to a single company
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, color: "#1f2937", fontFamily: "Helvetica" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111827" },
  muted: { color: "#6b7280" },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  section: { marginTop: 20 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e5e7eb", paddingBottom: 4, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  cDate: { width: 70 },
  cText: { flex: 1 },
  cProj: { width: 120 },
  cNum: { width: 55, textAlign: "right" },
  cFlag: { width: 50, textAlign: "right" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#9ca3af", borderTopWidth: 1, borderColor: "#e5e7eb", paddingTop: 8 },
});

export function TimesheetPdf({ data }: { data: TimesheetPdfData }) {
  const { report, entries, range, clientName } = data;
  const rangeText =
    range.from || range.to ? `${range.from ?? "start"} → ${range.to ?? "today"}` : "All time";
  return (
    <Document title={`Timesheet ${rangeText}`}>
      <Page size="A4" style={s.page}>
        <View style={s.row}>
          <View>
            <Text style={s.brand}>EndlessWorlds, LLC</Text>
            <Text style={s.muted}>Levittown, NY</Text>
          </View>
          <View>
            <Text style={s.docTitle}>TIMESHEET</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>{rangeText}</Text>
          </View>
        </View>

        {clientName ? (
          <View style={s.section}>
            <Text style={s.muted}>Prepared for</Text>
            <Text>{clientName}</Text>
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.h2}>Summary</Text>
          <View style={s.summaryRow}>
            <Text style={s.muted}>Total hours</Text>
            <Text>{report.hours}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.muted}>Billable hours</Text>
            <Text>{report.billableHours}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.muted}>Non-billable hours</Text>
            <Text>{report.nonBillableHours}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.muted}>Utilization</Text>
            <Text>{report.pct}%</Text>
          </View>
          {report.amountByCurrency.map((c) => (
            <View style={s.summaryRow} key={c.currency}>
              <Text style={s.muted}>Billable value ({c.currency})</Text>
              <Text>{formatMoney(c.amount, c.currency)}</Text>
            </View>
          ))}
        </View>

        {report.byProject.length > 0 ? (
          <View style={s.section}>
            <Text style={s.h2}>By project</Text>
            <View style={s.th}>
              <Text style={s.cText}>Client / Project</Text>
              <Text style={s.cNum}>Hours</Text>
              <Text style={s.cNum}>Billable</Text>
              <Text style={s.cNum}>Amount</Text>
            </View>
            {report.byProject.map((p, i) => (
              <View style={s.tr} key={i}>
                <Text style={s.cText}>
                  {p.companyName} · {p.projectName}
                </Text>
                <Text style={s.cNum}>{p.hours}</Text>
                <Text style={s.cNum}>{p.billableHours}</Text>
                <Text style={s.cNum}>{formatMoney(p.amount, p.currency)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.h2}>Detail</Text>
          <View style={s.th}>
            <Text style={s.cDate}>Date</Text>
            <Text style={s.cProj}>Project</Text>
            <Text style={s.cText}>Task</Text>
            <Text style={s.cNum}>Hours</Text>
            <Text style={s.cFlag}>Billable</Text>
          </View>
          {entries.map((e, i) => (
            <View style={s.tr} key={i}>
              <Text style={s.cDate}>{e.workDate}</Text>
              <Text style={s.cProj}>
                {(e.companyName ?? "—") + (e.projectName ? ` · ${e.projectName}` : "")}
              </Text>
              <Text style={s.cText}>{e.task ?? "—"}</Text>
              <Text style={s.cNum}>{e.hours}</Text>
              <Text style={s.cFlag}>{e.billable ? "Yes" : "No"}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer} fixed>
          EndlessWorlds, LLC · Levittown, NY · Generated timesheet report.
        </Text>
      </Page>
    </Document>
  );
}
