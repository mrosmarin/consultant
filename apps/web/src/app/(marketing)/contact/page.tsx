import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact — EndlessWorlds" };

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Get in touch</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
        Tell me about your team and what you&apos;re building. A contact form is on the way; for now,
        email{" "}
        <a href="mailto:hello@endlessworlds.xyz" className="text-brand hover:underline">
          hello@endlessworlds.xyz
        </a>
        .
      </p>
    </section>
  );
}
