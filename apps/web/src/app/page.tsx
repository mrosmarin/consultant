import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">EndlessWorlds</h1>
        <p className="text-muted-foreground mx-auto max-w-md text-lg">
          Consulting that builds endless worlds — strategy, delivery, and the tools to run it.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/auth/sign-up">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/auth/sign-in">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
