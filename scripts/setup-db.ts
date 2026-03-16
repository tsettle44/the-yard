#!/usr/bin/env npx tsx
/**
 * Database setup script — runs all migration files against your Supabase project
 * using a direct PostgreSQL connection.
 *
 * Usage:
 *   npm run db:setup
 *
 * Requires in .env.local:
 *   DATABASE_URL  — your Supabase Postgres connection string
 *                   (find it in Supabase Dashboard > Settings > Database > Connection string > URI)
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL in .env.local.\n" +
      "Find it in your Supabase Dashboard:\n" +
      "  Settings > Database > Connection string > URI\n" +
      "It looks like: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
  );
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: "require" });

const migrationsDir = join(process.cwd(), "supabase", "migrations");

async function run() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found in supabase/migrations/");
    return;
  }

  console.log(`Found ${files.length} migration(s):\n`);

  for (const file of files) {
    const migration = readFileSync(join(migrationsDir, file), "utf-8");
    console.log(`Running ${file}...`);

    try {
      await sql.unsafe(migration);
      console.log(`  Done.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Skip "already exists" errors so the script is re-runnable
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log(`  Skipped (already applied).`);
      } else {
        console.error(`  FAILED: ${msg}`);
        await sql.end();
        process.exit(1);
      }
    }
  }

  // Notify PostgREST to reload its schema cache so new functions are available via RPC
  try {
    await sql`SELECT pg_notify('pgrst', 'reload schema')`;
    console.log("\nPostgREST schema cache reload triggered.");
  } catch {
    console.log("\nNote: Could not notify PostgREST to reload schema cache.");
  }

  await sql.end();
  console.log("All migrations applied successfully.");
}

run().catch(async (err) => {
  console.error("Migration failed:", err);
  await sql.end();
  process.exit(1);
});
