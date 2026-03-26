import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não está definida no ambiente.");
  }
  return url;
}

export function getDb() {
  if (!globalForDb.queryClient) {
    globalForDb.queryClient = postgres(getConnectionString(), {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return drizzle(globalForDb.queryClient, { schema });
}

export { schema };
