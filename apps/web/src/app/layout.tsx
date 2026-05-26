import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { site, siteUrl } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EndlessWorlds — Engineering leadership & AI-native architecture",
    template: "%s · EndlessWorlds",
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "fractional engineering leadership",
    "fractional CTO",
    "AI-native architecture",
    "cloud architecture",
    "legacy modernization",
    "Kubernetes",
    "engineering consulting",
  ],
  authors: [{ name: site.founder }],
  creator: site.founder,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "EndlessWorlds — Engineering leadership & AI-native architecture",
    description: site.description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "EndlessWorlds — Engineering leadership & AI-native architecture",
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
