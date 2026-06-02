import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 font-semibold">
            <Image
              src="/logo-mark.png"
              alt=""
              width={48}
              height={24}
              className="h-6 w-auto"
            />
            <span>
              Endless<span className="text-brand">Worlds</span>
            </span>
          </p>
          <p className="text-muted-foreground max-w-xs text-sm">
            Engineering leadership &amp; AI-native architecture for teams that need to ship.
          </p>
        </div>
        <nav className="text-muted-foreground flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
          <Link href="/services" className="hover:text-foreground transition-colors">
            Services
          </Link>
          <Link href="/work" className="hover:text-foreground transition-colors">
            Work
          </Link>
          <Link href="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/insights" className="hover:text-foreground transition-colors">
            Insights
          </Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">
            Contact
          </Link>
          <Link href="/auth/sign-in" className="hover:text-foreground transition-colors">
            Client sign in
          </Link>
          <a href="mailto:hello@endlessworlds.xyz" className="hover:text-foreground transition-colors">
            hello@endlessworlds.xyz
          </a>
        </nav>
      </div>
      <div className="border-t">
        <div className="text-muted-foreground mx-auto max-w-6xl px-4 py-4 text-xs sm:px-6">
          © {year} EndlessWorlds, LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
