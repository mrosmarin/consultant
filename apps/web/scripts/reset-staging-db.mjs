// Reset the STAGING/QA environment to a clean slate for a full end-to-end test:
// wipes the login (Neon Auth users/sessions) AND the app data (timesheets,
// invoices, leads), keeping the schema, the auth signing keys, and the access
// allowlist. You then re-register from scratch.
//
// Staging is a SEPARATE Neon project ("EndlessWorlds.Staging") with its own
// database + Neon Auth, so this never touches production. Safe by construction:
// it asserts the target project's name before touching anything.
//
// Run via `make db-reset-staging` (sources NEON_API_KEY from .devcontainer/.env).
import { neon } from "@neondatabase/serverless";

const NEON_API_KEY = process.env.NEON_API_KEY;
const STAGING_PROJECT_ID = "winter-dew-93819743";
const STAGING_PROJECT_NAME = "EndlessWorlds.Staging";
const API = "https://console.neon.tech/api/v2";

if (!NEON_API_KEY) {
  console.error("✗ NEON_API_KEY is not set. Run via `make db-reset-staging` (sources .devcontainer/.env).");
  process.exit(1);
}
const auth = { headers: { Authorization: `Bearer ${NEON_API_KEY}` } };

// Safety: confirm we're pointed at the dedicated staging project — never prod.
const projRes = await fetch(`${API}/projects/${STAGING_PROJECT_ID}`, auth);
if (!projRes.ok) {
  console.error(`✗ Failed to fetch project ${STAGING_PROJECT_ID}: HTTP ${projRes.status}`);
  process.exit(1);
}
const { project } = await projRes.json();
if (project.name !== STAGING_PROJECT_NAME) {
  console.error(`✗ ABORT: project ${STAGING_PROJECT_ID} is "${project.name}", not "${STAGING_PROJECT_NAME}".`);
  process.exit(1);
}

// Connect to the project's default branch.
const { branches } = await (await fetch(`${API}/projects/${STAGING_PROJECT_ID}/branches`, auth)).json();
const branch = branches.find((b) => b.default) ?? branches[0];
const uri = new URL(`${API}/projects/${STAGING_PROJECT_ID}/connection_uri`);
uri.searchParams.set("branch_id", branch.id);
uri.searchParams.set("database_name", "neondb");
uri.searchParams.set("role_name", "neondb_owner");
uri.searchParams.set("pooled", "true");
const sql = neon((await (await fetch(uri, auth)).json()).uri);

// Wipe login + app data. Keep schema, auth signing keys (jwks), config, and the allowlist.
await sql`truncate table time_entries, invoices, leads restart identity`;
await sql`truncate table neon_auth."user", neon_auth.session, neon_auth.account, neon_auth.verification cascade`;

const [c] = await sql`
  select
    (select count(*)::int from time_entries) as time_entries,
    (select count(*)::int from invoices) as invoices,
    (select count(*)::int from leads) as leads,
    (select count(*)::int from neon_auth."user") as auth_users,
    (select count(*)::int from neon_auth.session) as auth_sessions,
    (select count(*)::int from allowed_emails where deleted_at is null) as allowlist`;

console.log(
  `✅ staging reset (project "${project.name}") — ` +
    `time_entries=${c.time_entries} invoices=${c.invoices} leads=${c.leads} ` +
    `auth_users=${c.auth_users} auth_sessions=${c.auth_sessions}; allowlist kept (${c.allowlist}). Re-register to test.`,
);
