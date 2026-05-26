import type { Metadata } from "next";

import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact — EndlessWorlds",
  description: "Tell me about your team and what you're building.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Get in touch</h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Tell me about your team and what you&apos;re building — fractional leadership, an
            AI-native build, or modernizing something that&apos;s holding you back.
          </p>
          <p className="text-muted-foreground mt-6 text-sm">
            Prefer email?{" "}
            <a href="mailto:hello@endlessworlds.xyz" className="text-brand hover:underline">
              hello@endlessworlds.xyz
            </a>
          </p>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
