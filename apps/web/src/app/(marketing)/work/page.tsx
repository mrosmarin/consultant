import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Selected engagements across Finance, Media, and Technology — GenAI platforms, cloud migrations, and analytics at scale.",
  alternates: { canonical: "/work" },
};

const CASES = [
  {
    name: "OpenClaw",
    client: "Codiac",
    sector: "Technology · Generative AI",
    role: "Director of Engineering",
    summary:
      "A secure generative-AI orchestration platform — LLM agents with skills, memory, and tools — delivered as a hosted solution on customer-owned Kubernetes.",
    outcomes: [
      "MVP launched four weeks ahead of schedule",
      "Zero-breach multi-tenant security with per-tenant RBAC",
      "AI-assisted dev workflows lifted productivity ~90%",
    ],
  },
  {
    name: "Enterprise AI Chatbot",
    client: "Invesco",
    sector: "Finance",
    role: "Senior Principal Engineer",
    summary:
      "Re-architected the firm's first AI chatbot from Dialogflow to a modern design on OpenAI / Azure, and modernized the delivery pipeline.",
    outcomes: [
      "Migrated to a modern LLM foundation on Azure",
      "CI/CD modernized: Jenkins → Bitbucket Pipelines + Helm + Artifactory",
      "Enterprise deployments on AWS EKS",
    ],
  },
  {
    name: "Product Data Access Portal",
    client: "Oppenheimer Funds",
    sector: "Finance",
    role: "Senior Solutions Engineer / Architect",
    summary:
      "A secure, interactive self-service platform for product data, with a flexible data-processing framework and standards-based auth.",
    outcomes: [
      "OpenID Connect between front-end and back-end services",
      "Cloud migration: Pivotal Cloud Foundry → OpenShift",
      "Significantly improved data accessibility",
    ],
  },
  {
    name: "Objective Health",
    client: "McKinsey & Company",
    sector: "Healthcare · Analytics",
    role: "Senior Architect / Tech Lead",
    summary:
      "An advanced analytics system for hospital executives — data warehousing plus interactive graphical analysis of core metrics.",
    outcomes: [
      "Rendered 50M-row datasets responsively",
      "Informed cost, margin, and strategic-planning decisions",
    ],
  },
  {
    name: "CleverCAD Voice Comms",
    client: "Clever Devices",
    sector: "Public Transportation",
    role: "Senior Software Architect",
    summary:
      "A mission-critical voice communication module integrating third-party radio infrastructure for transit operations.",
    outcomes: [
      "Reliable mission-critical comms with real-time monitoring",
      "Test framework + mock simulator for rigorous validation",
    ],
  },
];

export default function WorkPage() {
  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Work</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
            Selected engagements across Finance, Media, and Technology — from generative-AI
            platforms to large-scale cloud migrations and analytics at scale.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {CASES.map((c) => (
            <Card key={c.name} className="h-full">
              <CardHeader>
                <p className="text-brand font-mono text-xs">{c.sector}</p>
                <CardTitle className="mt-1 text-xl">
                  {c.name} <span className="text-muted-foreground font-normal">· {c.client}</span>
                </CardTitle>
                <p className="text-muted-foreground text-sm">{c.role}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{c.summary}</p>
                <ul className="grid gap-2">
                  {c.outcomes.map((o) => (
                    <li key={o} className="text-muted-foreground flex gap-2 text-sm">
                      <span className="bg-brand mt-1.5 size-1.5 shrink-0 rounded-full" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Have a problem like one of these?</h2>
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
