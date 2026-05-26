import Link from "next/link";
import { ArrowRight, Compass, Sparkles, Server } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATS = [
  { value: "30 yrs", label: "leading engineering" },
  { value: "90%", label: "dev-productivity gains" },
  { value: "AWS·GCP·Azure", label: "multi-cloud" },
  { value: "Early", label: "MVPs shipped ahead" },
];

const SERVICES = [
  {
    icon: Compass,
    title: "Fractional Engineering Leadership",
    body: "A Director/VP of Engineering on demand — technical strategy, roadmaps, org design, hiring, and delivery.",
  },
  {
    icon: Sparkles,
    title: "AI-Native & Cloud Architecture",
    body: "GenAI orchestration (LLM agents with skills, memory, tools), Kubernetes multi-tenant platforms, secure multi-cloud.",
  },
  {
    icon: Server,
    title: "Legacy Modernization & Migration",
    body: "De-risk moving off OS/400, PICK, and VMs onto Kubernetes — preserving business logic with zero downtime.",
  },
];

const WORK = ["OpenClaw @ Codiac", "Invesco", "Oppenheimer", "McKinsey", "Clever Devices"];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="from-brand/10 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <p className="text-brand mb-4 font-mono text-sm tracking-tight">EndlessWorlds, LLC</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Engineering leadership and AI-native architecture for teams that need to ship.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-2xl text-lg">
            30 years turning legacy constraints and AI ambition into production systems — as your
            fractional engineering leader or hands-on architect.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/contact">
                Work with me <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/work">See the work</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="py-8 md:px-4">
              <div className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
                {s.value}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What I do</h2>
          <Link href="/services" className="text-brand text-sm hover:underline">
            All services →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {SERVICES.map((s) => (
            <Card key={s.title} className="h-full">
              <CardHeader>
                <s.icon className="text-brand size-6" />
                <CardTitle className="mt-2 text-lg">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">{s.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Selected work */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-muted-foreground text-sm">Selected work</p>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-lg font-medium">
            {WORK.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Bio + CTA */}
      <section className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p className="text-muted-foreground max-w-2xl">
            A 30-year software leader and hands-on architect across Finance, Media, and Technology —
            who builds teams and ships code alike.
          </p>
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
