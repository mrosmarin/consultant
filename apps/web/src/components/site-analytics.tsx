"use client";

import { useSyncExternalStore } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

import { Button } from "@/components/ui/button";

const CONSENT_KEY = "ew-analytics-consent";
const CONSENT_EVENT = "ew-consent-change";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type Consent = "granted" | "denied";

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// GA4 is cookie-based, so it loads only after the visitor accepts. Consent is
// read from localStorage via useSyncExternalStore (no GA script/cookies before
// consent). Renders nothing unless NEXT_PUBLIC_GA_ID is configured.
export function SiteAnalytics() {
  const consent = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(CONSENT_KEY),
    () => null,
  );

  if (!GA_ID) return null;

  const choose = (value: Consent) => {
    localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  };

  return (
    <>
      {consent === "granted" ? <GoogleAnalytics gaId={GA_ID} /> : null}

      {consent === null ? (
        <div
          role="dialog"
          aria-label="Analytics cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 p-4"
        >
          <div className="bg-background mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              We use Google Analytics to understand site traffic. It sets cookies only if you accept.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={() => choose("denied")}>
                Decline
              </Button>
              <Button size="sm" onClick={() => choose("granted")}>
                Accept
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
