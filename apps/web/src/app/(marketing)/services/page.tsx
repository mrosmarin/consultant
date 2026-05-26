import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Sparkles, Server } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Services — EndlessWorlds",
  description:
    "Fractional engineering leadership, AI-native & cloud architecture, and legacy modernization.",
};

const SERVICES = [
  {
    icon: Compass,
    title: "Fractional Engineering Leadership",
    tagline: "A Director/VP of Engineering on demand.",
    includes: [
      "Technical strategy & product roadmap",
      "Org design, hiring, and team building",
      "Mentoring and a strong code-review culture",
      "Delivery management — milestones that actually land",
    ],
    proof: "15+ years leading distributed engineering teams; MVPs delivered weeks ahead of schedule.",
  },
  {
    icon: Sparkles,
    title: "AI-Native & Cloud Architecture",
    tagline: "Production-grade GenAI and cloud-native systems.",
    includes: [
      "GenAI orchestration — LLM agents with skills, memory, and tools",
      "Kubernetes multi-tenant platforms with role-based access",
      "Microservices (NATS.io) and secure multi-cloud (AWS · GCP · Azure)",
      "CI/CD modernization and developer-productivity tooling",
    ],
    proof: "Built OpenClaw, a secure GenAI orchestration platform; drove AI dev workflows to 90% productivity gains.",
  },
  {
    icon: Server,
    title: "Legacy Modernization & Cloud Migration",
    tagline: "Move off legacy without breaking the business.",
    includes: [
      "Assessment and an incremental migration roadmap",
      "OS/400, PICK, and VMs → Kubernetes",
      "CI/CD modernization (Jenkins → Bitbucket/Helm/Artifactory)",
      "Zero-downtime cutover; business logic preserved",
    ],
    proof: "Led platform transformations including PCF → OpenShift, eliminating technical debt with operational continuity.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Services</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
            Three ways I help teams ship — as a hands-on architect, a fractional leader, or the
            person who finally retires the legacy system.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl divide-y px-4 sm:px-6">
        {SERVICES.map((s) => (
          <section key={s.title} className="grid gap-8 py-14 md:grid-cols-[1fr_1.2fr]">
            <div>
              <s.icon className="text-brand size-7" />
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{s.title}</h2>
              <p className="text-muted-foreground mt-2">{s.tagline}</p>
            </div>
            <div className="space-y-6">
              <ul className="grid gap-3">
                {s.includes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="bg-brand mt-2 size-1.5 shrink-0 rounded-full" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground border-brand/40 border-l-2 pl-4 text-sm">
                {s.proof}
              </p>
            </div>
          </section>
        ))}
      </div>

      <section className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Not sure which fits? Let&apos;s talk it through.
          </h2>
          <Button asChild size="lg">
            <Link href="/contact">
              Get in touch <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
