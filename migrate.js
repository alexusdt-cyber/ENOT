import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Check if columns already exist
    const [rows] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'note_shares' AND COLUMN_NAME IN ('share_type', 'password')"
    );
    
    const existingColumns = rows.map(r => r.COLUMN_NAME);
    
    if (!existingColumns.includes('share_type')) {
      console.log("Adding share_type column...");
      await connection.query(
        "ALTER TABLE note_shares ADD COLUMN share_type VARCHAR(50) DEFAULT 'view_only' AFTER permission"
      );
      console.log("✓ share_type column added");
    } else {
      console.log("✓ share_type column already exists");
    }
    
    if (!existingColumns.includes('password')) {
      console.log("Adding password column...");
      await connection.query(
        "ALTER TABLE note_shares ADD COLUMN password VARCHAR(255) DEFAULT NULL AFTER share_type"
      );
      console.log("✓ password column added");
    } else {
      console.log("✓ password column already exists");
    }
    
    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
