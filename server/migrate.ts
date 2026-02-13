import { connection } from "./db";
import fs from "fs";
import path from "path";

async function runMigrations() {
  try {
    console.log("Starting database migrations...");

    const migrationPath = path.join(process.cwd(), "migrations", "001_initial_schema.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    const statements = migrationSQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }

    console.log("✅ Database migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
