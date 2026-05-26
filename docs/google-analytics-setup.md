# Google Analytics 4 — Setup (DEV-67)

The site has GA4 wired up behind a cookie-consent banner. It stays **completely
inert** until a Measurement ID is configured — no script, no cookies. Follow
these steps to get the ID and activate analytics.

## 1. Create a GA4 property

1. Go to **https://analytics.google.com** and sign in with your Google account.
2. **Admin** (gear icon, bottom-left) → **Create** → **Property**.
3. Property name: `EndlessWorlds` · set your time zone + currency → **Next**.
4. Fill in business details (industry, size) → **Create** and accept the terms.

## 2. Create a Web data stream

1. After the property is created, you'll be asked to choose a platform → pick **Web**.
   (Or: **Admin → Data streams → Add stream → Web**.)
2. **Website URL:** `https://endlessworlds-web.vercel.app`
   (or `https://endlessworlds.xyz` once the domain is live).
3. **Stream name:** `EndlessWorlds Web` → **Create stream**.

## 3. Copy the Measurement ID

On the stream's detail page, copy the **Measurement ID** in the top-right.
It looks like:

```
G-XXXXXXXXXX
```

That's the only value I need. **Send it to me** and I'll wire it up — or set it
yourself using step 4.

## 4. Where the ID goes (I can do this for you)

The app reads it from the env var **`NEXT_PUBLIC_GA_ID`**.

- **Vercel (production + preview):** Project `endlessworlds-web` → **Settings →
  Environment Variables** → add `NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX` for both
  **Production** and **Preview** → then redeploy.
- **Local dev (optional):** add `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` to
  `apps/web/.env.local`.

> `NEXT_PUBLIC_` vars are inlined at build time, so a **redeploy** is required
> after adding it.

## 5. What happens once it's set

- A small **cookie-consent banner** appears for new visitors.
- GA4 (and its cookies) load **only after the visitor clicks Accept** — nothing
  before that. Declining keeps the site analytics-free for that visitor.
- A `contact_lead` event fires when someone successfully submits the contact
  form (only if they accepted analytics).

## 6. Verify (I'll do this after you provide the ID)

- `https://endlessworlds-web.vercel.app/_…/gtag/js` style request loads after
  Accept (checked via the browser network tab / GA Realtime report).
- GA4 **Realtime** report shows your own visit once you accept the banner.

---

_Privacy note: GA4 is cookie-based, which is why it's gated behind explicit
consent. No personal data (name/email) is sent in events — only the page view
and the anonymous `contact_lead` conversion._
