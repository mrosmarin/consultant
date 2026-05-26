import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "A 30-year software leader and hands-on architect across Finance, Media, and Technology.",
  alternates: { canonical: "/about" },
};

const EXPERIENCE = [
  {
    period: "2024 — Present",
    role: "Director of Engineering",
    org: "Codiac",
    note: "Pioneered OpenClaw, a secure GenAI orchestration platform (LLM agents with skills, memory, tools) on customer-owned Kubernetes. Defined strategy and shipped the MVP four weeks early.",
  },
  {
    period: "2019 — 2024",
    role: "Senior Principal Engineer",
    org: "Invesco",
    note: "Led Research & Innovation engineering; re-architected the AI chatbot onto OpenAI/Azure; modernized CI/CD and deployments on AWS EKS.",
  },
  {
    period: "2014 — 2019",
    role: "Senior Solutions Engineer / Architect",
    org: "Oppenheimer Funds",
    note: "Built the Product Data Access Portal (secure self-service product data); drove cloud migration to Pivotal Cloud Foundry, then OpenShift.",
  },
  {
    period: "2013 — 2014",
    role: "Senior Software Architect",
    org: "Clever Devices",
    note: "Delivered mission-critical transit voice communications in CleverCAD, integrating third-party radio infrastructure with robust monitoring.",
  },
  {
    period: "2010 — 2013",
    role: "Senior Architect / Tech Lead",
    org: "McKinsey & Company",
    note: "Built Objective Health — hospital analytics rendering 50M-row datasets to guide executive cost and strategy decisions.",
  },
  {
    period: "1995 — 2010",
    role: "Engineer → Architect → Co-Founder",
    org: "Finance · Media · Technology",
    note: "Progressively senior roles establishing full-stack, architecture, and leadership foundations.",
  },
];

const EXPERTISE = [
  "Generative AI",
  "LLM agent orchestration",
  "Kubernetes",
  "Multi-cloud (AWS · GCP · Azure)",
  "Microservices (NATS.io)",
  "CI/CD modernization",
  "Legacy modernization",
  "Multi-tenant security",
  "Engineering leadership",
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">About</h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed">
            A 30-year software leader and hands-on architect across Finance, Media, and Technology.
            I build engineering teams and ship production systems alike — most recently in
            generative AI and cloud-native platforms, with a long track record of modernizing
            legacy systems without breaking the business.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {EXPERTISE.map((tag) => (
              <span
                key={tag}
                className="border-border text-muted-foreground rounded-full border px-3 py-1 font-mono text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Experience</h2>
        <div className="mt-8 space-y-8 border-l pl-6">
          {EXPERIENCE.map((e) => (
            <div key={e.org + e.period} className="relative">
              <span className="bg-brand absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full" />
              <p className="text-muted-foreground font-mono text-xs">{e.period}</p>
              <p className="mt-1 font-semibold">
                {e.role} · <span className="text-muted-foreground font-normal">{e.org}</span>
              </p>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{e.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Education</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              B.S. Computer Science (Math minor) — SUNY Plattsburgh.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/contact">
              Work with me <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
