import type { Metadata } from "next";

export const metadata: Metadata = { title: "Services — EndlessWorlds" };

export default function ServicesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Services</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
        Fractional engineering leadership, AI-native &amp; cloud architecture, and legacy
        modernization. Detailed service pages are on the way.
      </p>
    </section>
  );
}
