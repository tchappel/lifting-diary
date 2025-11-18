import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as relations from "./relations";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const db = drizzle(process.env.DATABASE_URL, {
  schema: { ...schema, ...relations }
});

export { db };
