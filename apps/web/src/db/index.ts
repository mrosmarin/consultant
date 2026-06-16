import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function createDb() {
  return drizzle({ client: neon(process.env.DATABASE_URL!), schema });
}

type Db = ReturnType<typeof createDb>;

// Lazily instantiate the Neon client on first use. `next build` evaluates route
// modules ("collect page data") which import this — eager `neon(...)` would
// throw when DATABASE_URL is unset (e.g. in CI). The Proxy defers creation until
// a real query touches `db`, so the build never needs a connection string.
let instance: Db | undefined;
const getDb = (): Db => (instance ??= createDb());

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});
