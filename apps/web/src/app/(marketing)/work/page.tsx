import type { Metadata } from "next";

export const metadata: Metadata = { title: "Work — EndlessWorlds" };

export default function WorkPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Work</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
        Selected engagements across Finance, Media, and Technology — from GenAI orchestration to
        large-scale cloud migrations. Case studies coming soon.
      </p>
    </section>
  );
}
