import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Notes on AI orchestration in production, cloud-native architecture, legacy modernization, and engineering leadership.",
  alternates: { canonical: "/insights" },
};

export default function InsightsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Insights</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
        Notes on AI orchestration, cloud-native architecture, legacy modernization, and engineering
        leadership. Articles coming soon.
      </p>
    </section>
  );
}
