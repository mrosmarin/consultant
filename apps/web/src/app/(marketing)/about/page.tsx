import type { Metadata } from "next";

export const metadata: Metadata = { title: "About — EndlessWorlds" };

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">About</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
        A 30-year software leader and hands-on architect across Finance, Media, and Technology — who
        builds teams and ships code alike. Full bio coming soon.
      </p>
    </section>
  );
}
