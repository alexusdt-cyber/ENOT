import mysql from "mysql2/promise";

async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("Creating database tables...");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      username VARCHAR(100),
      password TEXT,
      google_id VARCHAR(255) UNIQUE,
      telegram_id VARCHAR(255) UNIQUE,
      display_name VARCHAR(255),
      avatar_url TEXT,
      auth_method ENUM('email', 'google', 'telegram') NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX email_idx (email),
      INDEX google_id_idx (google_id),
      INDEX telegram_id_idx (telegram_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created users table");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) DEFAULT '#6366f1',
      icon VARCHAR(50),
      \`order\` INT DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX category_user_id_idx (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created categories table");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      category_id VARCHAR(36),
      title VARCHAR(255) NOT NULL,
      content LONGTEXT NOT NULL,
      content_type ENUM('markdown', 'html', 'rich_text') DEFAULT 'rich_text',
      tags TEXT,
      is_pinned BOOLEAN DEFAULT FALSE,
      is_favorite BOOLEAN DEFAULT FALSE,
      is_public BOOLEAN DEFAULT FALSE,
      share_token VARCHAR(64) UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_accessed_at TIMESTAMP NULL,
      INDEX note_user_id_idx (user_id),
      INDEX note_category_id_idx (category_id),
      UNIQUE INDEX share_token_idx (share_token),
      INDEX created_at_idx (created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created notes table");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS note_shares (
      id VARCHAR(36) PRIMARY KEY,
      note_id VARCHAR(36) NOT NULL,
      shared_with_user_id VARCHAR(36),
      permission ENUM('view', 'comment', 'edit') NOT NULL DEFAULT 'view',
      share_link VARCHAR(255) UNIQUE,
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(36) NOT NULL,
      INDEX share_note_id_idx (note_id),
      INDEX shared_with_idx (shared_with_user_id),
      UNIQUE INDEX share_link_idx (share_link),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created note_shares table");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS attachments (
      id VARCHAR(36) PRIMARY KEY,
      note_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_type VARCHAR(100) NOT NULL,
      file_size INT NOT NULL,
      url TEXT NOT NULL,
      width INT,
      height INT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX attachment_note_id_idx (note_id),
      INDEX attachment_user_id_idx (user_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created attachments table");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR(255) PRIMARY KEY,
      sess LONGTEXT NOT NULL,
      expire TIMESTAMP NOT NULL,
      INDEX expire_idx (expire)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created sessions table");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS task_categories (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) DEFAULT '#6366f1',
      icon VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX task_category_user_id_idx (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created task_categories table");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      category_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
      sticker VARCHAR(10),
      completed BOOLEAN DEFAULT FALSE,
      due_date TIMESTAMP NULL,
      \`order\` INT DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX task_user_id_idx (user_id),
      INDEX task_category_id_idx (category_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES task_categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created tasks table");

  // Allow NULL for category_id in tasks table
  try {
    await connection.execute(`
      ALTER TABLE tasks 
      DROP FOREIGN KEY tasks_ibfk_2
    `);
  } catch (e) {
    // Foreign key might not exist or have different name
  }
  
  try {
    await connection.execute(`
      ALTER TABLE tasks 
      MODIFY COLUMN category_id VARCHAR(36) NULL
    `);
    console.log("Updated tasks.category_id to allow NULL");
  } catch (e) {
    // Column might already be nullable
  }
  
  try {
    await connection.execute(`
      ALTER TABLE tasks 
      ADD CONSTRAINT tasks_category_fk 
      FOREIGN KEY (category_id) REFERENCES task_categories(id) ON DELETE SET NULL
    `);
    console.log("Added foreign key with SET NULL");
  } catch (e) {
    // Foreign key might already exist
  }

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id VARCHAR(36) PRIMARY KEY,
      task_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX subtask_task_id_idx (task_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created subtasks table");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS roadmaps (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      notebook VARCHAR(255) DEFAULT '',
      target_date TIMESTAMP NULL,
      pinned BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX roadmap_user_id_idx (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created roadmaps table");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS milestones (
      id VARCHAR(36) PRIMARY KEY,
      roadmap_id VARCHAR(36) NOT NULL,
      year INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      completed BOOLEAN DEFAULT FALSE,
      date TIMESTAMP NULL,
      \`order\` INT DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX milestone_roadmap_id_idx (roadmap_id),
      FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Created milestones table");

  await connection.end();
  console.log("Database initialization complete!");
}

initDatabase().catch(console.error);
