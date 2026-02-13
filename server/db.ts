import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import crypto from "crypto";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in environment variables");
}

export const connection = mysql.createPool(process.env.DATABASE_URL);

export const db = drizzle(connection, { schema, mode: "default" });

export type Database = typeof db;

export async function initializeDatabase() {
  // First, ensure roadmap_categories table exists before roadmaps
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roadmap_categories (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) DEFAULT '#6366f1',
        icon VARCHAR(50),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX roadmap_category_user_id_idx (user_id),
        CONSTRAINT fk_roadmap_category_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Roadmap categories table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Roadmap categories table already exists");
    } else {
      console.error("Error initializing roadmap_categories table:", error);
    }
  }

  // Check if roadmaps table exists and has the right structure
  try {
    const result: any = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'roadmaps' AND COLUMN_NAME = 'category_id'
    `);
    
    if (!result[0] || result[0].length === 0) {
      // Column doesn't exist, drop and recreate the table
      console.log("category_id column missing from roadmaps table, recreating...");
      await connection.query(`DROP TABLE IF EXISTS milestones`);
      await connection.query(`DROP TABLE IF EXISTS roadmaps`);
    }
  } catch (error: any) {
    console.log("Error checking roadmaps schema:", error);
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        images JSON DEFAULT ('[]'),
        price INT,
        completed BOOLEAN DEFAULT FALSE,
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX goal_user_id_idx (user_id),
        CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("Goals table initialized");
    
    // Ensure images column exists for existing tables
    try {
      const result: any = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'goals' AND COLUMN_NAME = 'images'
      `);
      
      if (!result[0] || result[0].length === 0) {
        await connection.query(`ALTER TABLE goals ADD COLUMN images JSON DEFAULT ('[]')`);
        console.log("Added images column to goals table");
      } else {
        // Update existing NULL values to empty array
        await connection.query(`UPDATE goals SET images = '[]' WHERE images IS NULL`);
        console.log("Images column already exists, updated NULL values to empty array");
      }
    } catch (alterError: any) {
      console.log("Error checking/adding images column to goals:", alterError.message);
    }
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Goals table already exists");
      // Ensure images column exists
      try {
        const result: any = await connection.query(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'goals' AND COLUMN_NAME = 'images'
        `);
        
        if (!result[0] || result[0].length === 0) {
          await connection.query(`ALTER TABLE goals ADD COLUMN images JSON DEFAULT ('[]')`);
          console.log("Added images column to goals table");
        } else {
          // Update existing NULL values to empty array
          await connection.query(`UPDATE goals SET images = '[]' WHERE images IS NULL`);
          console.log("Images column exists, updated NULL values to empty array");
        }
      } catch (alterError: any) {
        console.log("Error checking/adding images column to goals:", alterError.message);
      }
    } else {
      console.error("Error initializing goals table:", error);
    }
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(7) DEFAULT '#3B82F6',
        parent_id VARCHAR(36),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX folder_user_id_idx (user_id),
        INDEX folder_parent_id_idx (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Folders table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Folders table already exists");
    } else {
      console.error("Error initializing folders table:", error);
    }
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS files (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        folder_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INT NOT NULL,
        file_type ENUM('image', 'document', 'video', 'audio', 'code', 'archive', 'other') DEFAULT 'other',
        path TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX file_user_id_idx (user_id),
        INDEX file_folder_id_idx (folder_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Files table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Files table already exists");
    } else {
      console.error("Error initializing files table:", error);
    }
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS download_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        download_count INT DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX download_token_idx (token),
        INDEX download_token_user_id_idx (user_id),
        CONSTRAINT fk_download_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Download tokens table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Download tokens table already exists");
    } else {
      console.error("Error initializing download_tokens table:", error);
    }
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roadmaps (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        category_id VARCHAR(36),
        title VARCHAR(255) NOT NULL,
        notebook VARCHAR(255) DEFAULT '',
        target_date TIMESTAMP,
        pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX roadmap_user_id_idx (user_id),
        INDEX roadmap_category_id_idx (category_id),
        CONSTRAINT fk_roadmap_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_roadmap_category FOREIGN KEY (category_id) REFERENCES roadmap_categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Roadmaps table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Roadmaps table already exists");
    } else {
      console.error("Error initializing roadmaps table:", error);
    }
  }

  try {
    // First create the table without images column
    await connection.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id VARCHAR(36) PRIMARY KEY,
        roadmap_id VARCHAR(36) NOT NULL,
        year INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        \`date\` TIMESTAMP,
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX milestone_roadmap_id_idx (roadmap_id),
        CONSTRAINT fk_milestone_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Milestones table initialized");
    
    // Now ensure images column exists
    try {
      const result: any = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'milestones' AND COLUMN_NAME = 'images'
      `);
      
      if (!result[0] || result[0].length === 0) {
        // Column doesn't exist, add it
        await connection.query(`ALTER TABLE milestones ADD COLUMN images TEXT`);
        console.log("Added images column to milestones table");
      } else {
        console.log("Images column already exists");
      }
    } catch (alterError: any) {
      console.log("Error checking/adding images column:", alterError.message);
    }
    
    // Ensure pdf_files column exists
    try {
      const result: any = await connection.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'milestones' AND COLUMN_NAME = 'pdf_files'
      `);
      
      if (!result[0] || result[0].length === 0) {
        await connection.query(`ALTER TABLE milestones ADD COLUMN pdf_files TEXT`);
        console.log("Added pdf_files column to milestones table");
      } else {
        console.log("pdf_files column already exists");
      }
    } catch (alterError: any) {
      console.log("Error checking/adding pdf_files column:", alterError.message);
    }
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Milestones table already exists");
      // Ensure images column exists
      try {
        const result: any = await connection.query(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'milestones' AND COLUMN_NAME = 'images'
        `);
        
        if (!result[0] || result[0].length === 0) {
          await connection.query(`ALTER TABLE milestones ADD COLUMN images TEXT`);
          console.log("Added images column to milestones table");
        } else {
          console.log("Images column already exists");
        }
      } catch (alterError: any) {
        console.log("Error checking/adding images column:", alterError.message);
      }
      
      // Ensure pdf_files column exists
      try {
        const result: any = await connection.query(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'milestones' AND COLUMN_NAME = 'pdf_files'
        `);
        
        if (!result[0] || result[0].length === 0) {
          await connection.query(`ALTER TABLE milestones ADD COLUMN pdf_files TEXT`);
          console.log("Added pdf_files column to milestones table");
        } else {
          console.log("pdf_files column already exists");
        }
      } catch (alterError: any) {
        console.log("Error checking/adding pdf_files column:", alterError.message);
      }
    } else {
      console.error("Error initializing milestones table:", error);
    }
  }

  // Link Center tables
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS link_categories (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50) DEFAULT 'Folder',
        color VARCHAR(7) DEFAULT '#6366f1',
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX link_category_user_id_idx (user_id),
        CONSTRAINT fk_link_category_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Link categories table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Link categories table already exists");
    } else {
      console.error("Error initializing link_categories table:", error);
    }
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS links (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        category_id VARCHAR(36) NOT NULL,
        url TEXT NOT NULL,
        title VARCHAR(500),
        description TEXT,
        favicon TEXT,
        image TEXT,
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX link_user_id_idx (user_id),
        INDEX link_category_id_idx (category_id),
        CONSTRAINT fk_link_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_link_category FOREIGN KEY (category_id) REFERENCES link_categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Links table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Links table already exists");
    } else {
      console.error("Error initializing links table:", error);
    }
  }

  // App Store tables
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50),
        color VARCHAR(7) DEFAULT '#6366f1',
        \`order\` INT DEFAULT 0,
        app_type VARCHAR(20) NOT NULL DEFAULT 'internal',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("App categories table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("App categories table already exists");
    } else {
      console.error("Error initializing app_categories table:", error);
    }
  }

  // Migration: Add app_type column to app_categories if it doesn't exist
  try {
    const [rows]: any = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'app_categories' AND COLUMN_NAME = 'app_type'
    `);
    if (!rows || rows.length === 0) {
      await connection.query(`ALTER TABLE app_categories ADD COLUMN app_type VARCHAR(20) NOT NULL DEFAULT 'internal'`);
      console.log("Added app_type column to app_categories table");
    }
  } catch (alterError: any) {
    console.log("Error checking/adding app_type to app_categories:", alterError.message);
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS apps (
        id VARCHAR(36) PRIMARY KEY,
        category_id VARCHAR(36),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        short_description VARCHAR(255),
        icon TEXT,
        screenshots JSON DEFAULT ('[]'),
        developer VARCHAR(100),
        version VARCHAR(20),
        size VARCHAR(20),
        rating INT DEFAULT 0,
        downloads INT DEFAULT 0,
        price INT DEFAULT 0,
        launch_url TEXT,
        featured BOOLEAN DEFAULT FALSE,
        app_type VARCHAR(20) NOT NULL DEFAULT 'internal',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX app_category_id_idx (category_id),
        INDEX app_featured_idx (featured),
        INDEX app_type_idx (app_type),
        CONSTRAINT fk_app_category FOREIGN KEY (category_id) REFERENCES app_categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Apps table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Apps table already exists");
    } else {
      console.error("Error initializing apps table:", error);
    }
  }

  // Migration: Add app_type column to apps if it doesn't exist
  try {
    const [rows]: any = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'apps' AND COLUMN_NAME = 'app_type'
    `);
    if (!rows || rows.length === 0) {
      await connection.query(`ALTER TABLE apps ADD COLUMN app_type VARCHAR(20) NOT NULL DEFAULT 'internal'`);
      await connection.query(`CREATE INDEX app_type_idx ON apps(app_type)`);
      console.log("Added app_type column and index to apps table");
    }
  } catch (alterError: any) {
    console.log("Error checking/adding app_type to apps:", alterError.message);
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_apps (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        app_id VARCHAR(36) NOT NULL,
        added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_launched_at TIMESTAMP,
        is_favorite BOOLEAN DEFAULT FALSE,
        INDEX user_app_user_id_idx (user_id),
        INDEX user_app_app_id_idx (app_id),
        UNIQUE INDEX user_app_unique_idx (user_id, app_id),
        CONSTRAINT fk_user_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_app_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("User apps table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("User apps table already exists");
    } else {
      console.error("Error initializing user_apps table:", error);
    }
  }

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_reviews (
        id VARCHAR(36) PRIMARY KEY,
        app_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        rating INT NOT NULL,
        title VARCHAR(255),
        content TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX review_app_id_idx (app_id),
        INDEX review_user_id_idx (user_id),
        CONSTRAINT fk_review_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
        CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("App reviews table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("App reviews table already exists");
    } else {
      console.error("Error initializing app_reviews table:", error);
    }
  }

  // Migration: Add launch_mode column to apps table if it doesn't exist
  try {
    const [rows]: any = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'apps' AND COLUMN_NAME = 'launch_mode'
    `);
    if (!rows || rows.length === 0) {
      await connection.query(`ALTER TABLE apps ADD COLUMN launch_mode VARCHAR(20) NOT NULL DEFAULT 'external'`);
      console.log("Added launch_mode column to apps table");
    }
  } catch (alterError: any) {
    console.log("Error checking/adding launch_mode to apps:", alterError.message);
  }

  // Migration: Add component_key column to apps table if it doesn't exist
  try {
    const [rows]: any = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'apps' AND COLUMN_NAME = 'component_key'
    `);
    if (!rows || rows.length === 0) {
      await connection.query(`ALTER TABLE apps ADD COLUMN component_key VARCHAR(50)`);
      console.log("Added component_key column to apps table");
    }
  } catch (alterError: any) {
    console.log("Error checking/adding component_key to apps:", alterError.message);
  }

  // Migration: Add Mini Apps SSO columns to apps table
  const ssoColumns = [
    { name: 'origin', sql: 'ADD COLUMN origin VARCHAR(255)' },
    { name: 'allowed_origins', sql: 'ADD COLUMN allowed_origins JSON' },
    { name: 'allowed_post_message_origins', sql: 'ADD COLUMN allowed_post_message_origins JSON' },
    { name: 'allowed_start_url_patterns', sql: 'ADD COLUMN allowed_start_url_patterns JSON' },
    { name: 'allowed_navigation_origins', sql: 'ADD COLUMN allowed_navigation_origins JSON' },
    { name: 'scopes', sql: 'ADD COLUMN scopes JSON' },
    { name: 'sso_mode', sql: "ADD COLUMN sso_mode VARCHAR(20) DEFAULT 'none'" },
    { name: 'status', sql: "ADD COLUMN status VARCHAR(20) DEFAULT 'active'" },
  ];
  
  for (const col of ssoColumns) {
    try {
      const [colRows]: any = await connection.query(`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'apps' AND COLUMN_NAME = '${col.name}'
      `);
      if (colRows[0].count === 0) {
        await connection.query(`ALTER TABLE apps ${col.sql}`);
        console.log(`Added ${col.name} column to apps table`);
      }
    } catch (alterError: any) {
      console.log(`Error adding ${col.name} to apps:`, alterError.message);
    }
  }

  // Migration: Create miniapp_sessions table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS miniapp_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        app_id VARCHAR(36) NOT NULL,
        session_nonce VARCHAR(64) NOT NULL UNIQUE,
        app_origin VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX miniapp_session_user_id_idx (user_id),
        INDEX miniapp_session_app_id_idx (app_id),
        INDEX miniapp_session_expires_idx (expires_at),
        CONSTRAINT fk_miniapp_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_miniapp_session_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Mini app sessions table initialized");
  } catch (createError: any) {
    console.log("Error creating miniapp_sessions table:", createError.message);
  }

  // Migration: Create sso_tickets table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sso_tickets (
        id VARCHAR(36) PRIMARY KEY,
        jti VARCHAR(64) NOT NULL UNIQUE,
        user_id VARCHAR(36) NOT NULL,
        app_id VARCHAR(36) NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX sso_ticket_user_id_idx (user_id),
        INDEX sso_ticket_app_id_idx (app_id),
        INDEX sso_ticket_expires_idx (expires_at),
        CONSTRAINT fk_sso_ticket_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_sso_ticket_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("SSO tickets table initialized");
  } catch (createError: any) {
    console.log("Error creating sso_tickets table:", createError.message);
  }

  // Check if My Memory Map app exists, seed it if not
  try {
    const [memoryMapRows]: any = await connection.query(`SELECT COUNT(*) as count FROM apps WHERE component_key = 'my_memory_map'`);
    
    if (memoryMapRows[0].count === 0) {
      // Check/create Personal category for internal apps
      const [personalCatRows]: any = await connection.query(`SELECT id FROM app_categories WHERE name = 'Личное' AND app_type = 'internal' LIMIT 1`);
      
      let personalCategoryId: string;
      if (!personalCatRows || personalCatRows.length === 0) {
        personalCategoryId = crypto.randomUUID();
        await connection.query(`
          INSERT INTO app_categories (id, name, icon, color, \`order\`, app_type) VALUES
          ('${personalCategoryId}', 'Личное', 'User', '#8b5cf6', 1, 'internal')
        `);
        console.log("Created 'Личное' category");
      } else {
        personalCategoryId = personalCatRows[0].id;
      }
      
      const myMemoryMapId = crypto.randomUUID();
      
      await connection.query(`
        INSERT INTO apps (id, category_id, name, description, short_description, icon, developer, version, size, rating, downloads, price, launch_url, featured, app_type, launch_mode, component_key) VALUES
        ('${myMemoryMapId}', '${personalCategoryId}', 'My Memory Map', 
         'My Memory Map — интерактивная карта мира для хранения ваших личных воспоминаний. Создавайте точки на карте, привязанные к географическим координатам. Каждое воспоминание содержит текстовые заметки, фотогалерею, прикрепленные файлы и визуальные настройки. Делитесь воспоминаниями с друзьями по их логину. Ваши воспоминания всегда приватны и доступны только вам и тем, с кем вы решили поделиться.',
         'Храните воспоминания на карте мира',
         '🗺️', 'Tapp Team', '1.0.0', '15 MB', 5, 0, 0, NULL, TRUE, 'internal', 'modal', 'my_memory_map')
      `);
      
      console.log("My Memory Map app created");
    } else {
      // Update screenshots for existing My Memory Map app
      await connection.query(`
        UPDATE apps SET screenshots = JSON_ARRAY(
          '/attached_assets/Screenshot_61_1767890094000.png',
          '/attached_assets/Screenshot_62_1767890094002.png',
          '/attached_assets/Screenshot_63_1767890094004.png'
        ) WHERE component_key = 'my_memory_map'
      `);
    }
  } catch (error: any) {
    console.log("Error seeding My Memory Map app:", error.message);
  }

  // ==================== MY MEMORY MAP MODULE ====================
  
  // Create memory_map_markers table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS memory_map_markers (
        id VARCHAR(36) PRIMARY KEY,
        owner_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        lat DECIMAL(10, 6) NOT NULL,
        lng DECIMAL(10, 6) NOT NULL,
        event_date TIMESTAMP NULL,
        icon VARCHAR(10) DEFAULT '📍',
        color VARCHAR(7) DEFAULT '#ef4444',
        tags JSON DEFAULT ('[]'),
        blocks JSON DEFAULT ('[]'),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX marker_owner_id_idx (owner_id),
        INDEX marker_coords_idx (lat, lng),
        CONSTRAINT fk_marker_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Memory map markers table initialized");
  } catch (error: any) {
    if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.errno !== 1050) {
      console.error("Error initializing memory_map_markers table:", error);
    }
  }
  
  // Ensure blocks column exists (migration for existing tables)
  try {
    await connection.query(`ALTER TABLE memory_map_markers ADD COLUMN blocks JSON DEFAULT ('[]')`);
    console.log("Added blocks column to memory_map_markers");
  } catch (e: any) {
    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
      console.log("Error adding blocks column:", e.message);
    }
  }

  // Create memory_map_media table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS memory_map_media (
        id VARCHAR(36) PRIMARY KEY,
        marker_id VARCHAR(36) NOT NULL,
        type ENUM('photo', 'file') NOT NULL DEFAULT 'photo',
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INT NOT NULL,
        storage_path TEXT NOT NULL,
        url TEXT,
        file_id VARCHAR(36),
        order_index INT DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX media_marker_id_idx (marker_id),
        INDEX media_file_id_idx (file_id),
        CONSTRAINT fk_media_marker FOREIGN KEY (marker_id) REFERENCES memory_map_markers(id) ON DELETE CASCADE,
        CONSTRAINT fk_media_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Memory map media table initialized");
  } catch (error: any) {
    if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.errno !== 1050) {
      console.error("Error initializing memory_map_media table:", error);
    }
  }

  // Ensure url and file_id columns exist (migration for existing tables)
  try {
    const [urlResult]: any = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'memory_map_media' AND COLUMN_NAME = 'url'
    `);
    if (!urlResult || urlResult.length === 0) {
      await connection.query(`ALTER TABLE memory_map_media ADD COLUMN url TEXT`);
      console.log("Added url column to memory_map_media");
    }
  } catch (e: any) {
    console.log("Error checking/adding url column:", e.message);
  }
  
  try {
    const [fileIdResult]: any = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'memory_map_media' AND COLUMN_NAME = 'file_id'
    `);
    if (!fileIdResult || fileIdResult.length === 0) {
      await connection.query(`ALTER TABLE memory_map_media ADD COLUMN file_id VARCHAR(36)`);
      console.log("Added file_id column to memory_map_media");
    }
  } catch (e: any) {
    console.log("Error checking/adding file_id column:", e.message);
  }

  // Migrate type enum to include 'video' (idempotent check)
  try {
    const [enumResult]: any = await connection.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'memory_map_media' AND COLUMN_NAME = 'type'
    `);
    const currentEnum = enumResult?.[0]?.COLUMN_TYPE || "";
    if (!currentEnum.includes("video")) {
      await connection.query(`
        ALTER TABLE memory_map_media 
        MODIFY COLUMN type ENUM('photo', 'video', 'file') NOT NULL DEFAULT 'photo'
      `);
      console.log("Updated memory_map_media type enum to include video");
    }
  } catch (e: any) {
    console.log("Type enum migration:", e.message);
  }

  // Create memory_map_access table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS memory_map_access (
        id VARCHAR(36) PRIMARY KEY,
        marker_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        role ENUM('viewer', 'editor') NOT NULL DEFAULT 'viewer',
        granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX access_marker_id_idx (marker_id),
        INDEX access_user_id_idx (user_id),
        UNIQUE INDEX access_marker_user_idx (marker_id, user_id),
        CONSTRAINT fk_access_marker FOREIGN KEY (marker_id) REFERENCES memory_map_markers(id) ON DELETE CASCADE,
        CONSTRAINT fk_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Memory map access table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Memory map access table already exists");
    } else {
      console.error("Error initializing memory_map_access table:", error);
    }
  }

  // ==================== BALANCES MODULE ====================
  
  // Create balances table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS balances (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) DEFAULT NULL COMMENT 'Описание баланса',
        paysystem VARCHAR(255) DEFAULT NULL COMMENT 'Кодовое название баланса',
        currency VARCHAR(20) DEFAULT NULL COMMENT 'Тикер курса',
        rate DECIMAL(20,10) NOT NULL DEFAULT 0.0000000000 COMMENT 'Курс к доллару',
        minpay DECIMAL(20,10) NOT NULL DEFAULT 0.0000000000 COMMENT 'Минимальный платеж',
        maxpay DECIMAL(20,10) NOT NULL DEFAULT 0.0000000000 COMMENT 'Максимальный платеж',
        minpayout DECIMAL(20,10) NOT NULL DEFAULT 0.0000000000 COMMENT 'Минимальная выплата',
        maxpayout DECIMAL(20,10) NOT NULL DEFAULT 0.0000000000 COMMENT 'Максимальная выплата',
        type INT NOT NULL DEFAULT 1 COMMENT '1 - фиат, 2 - криптовалюта, 3 - платежная система',
        status INT NOT NULL DEFAULT 0 COMMENT '1 включена, 0 отключена',
        INDEX balance_currency_idx (currency)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Balances table initialized");
    
    // Seed ENOTE balance if not exists
    const [existingBalance] = await connection.query(`SELECT id FROM balances WHERE currency = 'ENOTE' LIMIT 1`);
    if (!Array.isArray(existingBalance) || existingBalance.length === 0) {
      await connection.query(`
        INSERT INTO balances (title, paysystem, currency, rate, type, status) 
        VALUES ('ENOTE Balance', 'enote', 'ENOTE', 0.2500000000, 2, 1)
      `);
      console.log("ENOTE balance seeded with rate 0.25");
    }
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Balances table already exists");
    } else {
      console.error("Error initializing balances table:", error);
    }
  }
  
  // Create users_balances table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users_balances (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL COMMENT 'ID пользователя',
        balance_id INT NOT NULL COMMENT 'ID балансов таблица balances',
        sum DECIMAL(20,10) NOT NULL DEFAULT 0.0000000000 COMMENT 'Сумма баланса',
        stat_sum DECIMAL(20,10) DEFAULT 0.0000000000 COMMENT 'Статистика баланса',
        status INT NOT NULL DEFAULT 1 COMMENT '1 работает, 0 заблокирован',
        INDEX user_balance_user_id_idx (user_id),
        INDEX user_balance_balance_id_idx (balance_id),
        UNIQUE INDEX user_balance_unique_idx (user_id, balance_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (balance_id) REFERENCES balances(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Users balances table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Users balances table already exists");
    } else {
      console.error("Error initializing users_balances table:", error);
    }
  }

  // ==================== CRYPTO WALLETS MODULE ====================
  
  // Create crypto_networks table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS crypto_networks (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        node_id INT NOT NULL,
        color VARCHAR(7) DEFAULT '#6366f1',
        gradient VARCHAR(100),
        icon_url TEXT,
        explorer_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX network_code_idx (code),
        INDEX network_node_id_idx (node_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Crypto networks table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Crypto networks table already exists");
    } else {
      console.error("Error initializing crypto_networks table:", error);
    }
  }

  // Create crypto_coins table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS crypto_coins (
        id VARCHAR(36) PRIMARY KEY,
        network_id VARCHAR(36) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        decimals INT DEFAULT 18,
        contract_address VARCHAR(100),
        is_native BOOLEAN DEFAULT FALSE,
        icon_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX coin_network_id_idx (network_id),
        INDEX coin_symbol_idx (symbol),
        CONSTRAINT fk_coin_network FOREIGN KEY (network_id) REFERENCES crypto_networks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Crypto coins table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Crypto coins table already exists");
    } else {
      console.error("Error initializing crypto_coins table:", error);
    }
  }

  // Create crypto_wallets table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS crypto_wallets (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        network_id VARCHAR(36) NOT NULL,
        address VARCHAR(150) NOT NULL,
        label VARCHAR(100),
        encrypted_private_key TEXT,
        managed_by_api BOOLEAN DEFAULT TRUE,
        external_wallet_id INT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX wallet_user_id_idx (user_id),
        INDEX wallet_network_id_idx (network_id),
        INDEX wallet_address_idx (address),
        INDEX wallet_user_network_idx (user_id, network_id),
        CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_wallet_network FOREIGN KEY (network_id) REFERENCES crypto_networks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Crypto wallets table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Crypto wallets table already exists");
    } else {
      console.error("Error initializing crypto_wallets table:", error);
    }
  }

  // Create user_networks table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_networks (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        network_id VARCHAR(36) NOT NULL,
        added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX user_network_user_id_idx (user_id),
        INDEX user_network_network_id_idx (network_id),
        UNIQUE INDEX user_network_unique_idx (user_id, network_id),
        CONSTRAINT fk_user_network_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_network_network FOREIGN KEY (network_id) REFERENCES crypto_networks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("User networks table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("User networks table already exists");
    } else {
      console.error("Error initializing user_networks table:", error);
    }
  }

  // Create user_features table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_features (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        feature_key ENUM('crypto_wallets', 'advanced_notes', 'premium_themes') NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX user_feature_user_id_idx (user_id),
        INDEX user_feature_key_idx (feature_key),
        UNIQUE INDEX user_feature_unique_idx (user_id, feature_key),
        CONSTRAINT fk_user_feature_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("User features table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("User features table already exists");
    } else {
      console.error("Error initializing user_features table:", error);
    }
  }

  // Create user_wallet_api_tokens table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_wallet_api_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE,
        external_user_hash VARCHAR(100) NOT NULL,
        encrypted_api_token TEXT NOT NULL,
        refreshed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        UNIQUE INDEX wallet_api_token_user_id_idx (user_id),
        CONSTRAINT fk_wallet_api_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("User wallet API tokens table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("User wallet API tokens table already exists");
    } else {
      console.error("Error initializing user_wallet_api_tokens table:", error);
    }
  }

  // Seed crypto networks if none exist
  try {
    const [rows]: any = await connection.query(`SELECT COUNT(*) as count FROM crypto_networks`);
    if (rows[0].count === 0) {
      const networks = [
        { code: 'TRON', name: 'TRON', symbol: 'TRX', nodeId: 1, color: '#EF0027', gradient: 'linear-gradient(135deg, #EF0027 0%, #FF6B6B 100%)', explorerUrl: 'https://tronscan.org' },
        { code: 'BSC', name: 'BNB Smart Chain', symbol: 'BNB', nodeId: 2, color: '#F3BA2F', gradient: 'linear-gradient(135deg, #F3BA2F 0%, #FFD93D 100%)', explorerUrl: 'https://bscscan.com' },
        { code: 'TON', name: 'TON', symbol: 'TON', nodeId: 3, color: '#0088CC', gradient: 'linear-gradient(135deg, #0088CC 0%, #00C6FB 100%)', explorerUrl: 'https://tonscan.org' },
        { code: 'ETH', name: 'Ethereum', symbol: 'ETH', nodeId: 4, color: '#627EEA', gradient: 'linear-gradient(135deg, #627EEA 0%, #8B9FFF 100%)', explorerUrl: 'https://etherscan.io' },
        { code: 'POLYGON', name: 'Polygon', symbol: 'MATIC', nodeId: 5, color: '#8247E5', gradient: 'linear-gradient(135deg, #8247E5 0%, #A879FF 100%)', explorerUrl: 'https://polygonscan.com' },
        { code: 'ARBITRUM', name: 'Arbitrum', symbol: 'ARB', nodeId: 6, color: '#28A0F0', gradient: 'linear-gradient(135deg, #28A0F0 0%, #5BC0FF 100%)', explorerUrl: 'https://arbiscan.io' },
        { code: 'SOLANA', name: 'Solana', symbol: 'SOL', nodeId: 7, color: '#9945FF', gradient: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)', explorerUrl: 'https://solscan.io' },
        { code: 'AVALANCHE', name: 'Avalanche', symbol: 'AVAX', nodeId: 8, color: '#E84142', gradient: 'linear-gradient(135deg, #E84142 0%, #FF6B6B 100%)', explorerUrl: 'https://snowtrace.io' },
        { code: 'POLKADOT', name: 'Polkadot', symbol: 'DOT', nodeId: 9, color: '#E6007A', gradient: 'linear-gradient(135deg, #E6007A 0%, #FF4DA6 100%)', explorerUrl: 'https://polkadot.subscan.io' },
        { code: 'TEZOS', name: 'Tezos', symbol: 'XTZ', nodeId: 10, color: '#2C7DF7', gradient: 'linear-gradient(135deg, #2C7DF7 0%, #5FA4FF 100%)', explorerUrl: 'https://tzkt.io' },
        { code: 'XRP', name: 'XRP Ledger', symbol: 'XRP', nodeId: 11, color: '#23292F', gradient: 'linear-gradient(135deg, #23292F 0%, #4A5568 100%)', explorerUrl: 'https://xrpscan.com' },
        { code: 'DOGECOIN', name: 'Dogecoin', symbol: 'DOGE', nodeId: 12, color: '#C3A634', gradient: 'linear-gradient(135deg, #C3A634 0%, #F5D800 100%)', explorerUrl: 'https://dogechain.info' },
        { code: 'CARDANO', name: 'Cardano', symbol: 'ADA', nodeId: 13, color: '#0033AD', gradient: 'linear-gradient(135deg, #0033AD 0%, #3366FF 100%)', explorerUrl: 'https://cardanoscan.io' },
        { code: 'MONERO', name: 'Monero', symbol: 'XMR', nodeId: 14, color: '#FF6600', gradient: 'linear-gradient(135deg, #FF6600 0%, #FF9933 100%)', explorerUrl: 'https://xmrchain.net' },
      ];
      
      for (const network of networks) {
        const id = crypto.randomUUID();
        await connection.query(`
          INSERT INTO crypto_networks (id, code, name, symbol, node_id, color, gradient, explorer_url, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `, [id, network.code, network.name, network.symbol, network.nodeId, network.color, network.gradient, network.explorerUrl]);
      }
      console.log("Seeded 14 crypto networks");

      // Seed native coins
      const [networkRows]: any = await connection.query(`SELECT id, code, symbol, name FROM crypto_networks`);
      const decimalsMap: Record<string, number> = {
        'TRON': 6, 'SOLANA': 9, 'XRP': 6, 'DOGECOIN': 8, 'CARDANO': 6, 'TEZOS': 6, 'POLKADOT': 10, 'MONERO': 12
      };
      
      for (const network of networkRows) {
        const coinId = crypto.randomUUID();
        const decimals = decimalsMap[network.code] || 18;
        await connection.query(`
          INSERT INTO crypto_coins (id, network_id, symbol, name, decimals, is_native)
          VALUES (?, ?, ?, ?, ?, TRUE)
        `, [coinId, network.id, network.symbol, network.name, decimals]);
      }
      console.log("Seeded native coins for all networks");

      // Seed USDT for major networks
      const usdtNetworks: Record<string, { decimals: number, contract: string }> = {
        'TRON': { decimals: 6, contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
        'ETH': { decimals: 18, contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        'BSC': { decimals: 18, contract: '0x55d398326f99059fF775485246999027B3197955' },
        'POLYGON': { decimals: 6, contract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
        'ARBITRUM': { decimals: 6, contract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
        'AVALANCHE': { decimals: 6, contract: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' },
        'TON': { decimals: 6, contract: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
      };
      
      for (const network of networkRows) {
        if (usdtNetworks[network.code]) {
          const coinId = crypto.randomUUID();
          const usdt = usdtNetworks[network.code];
          await connection.query(`
            INSERT INTO crypto_coins (id, network_id, symbol, name, decimals, contract_address, is_native)
            VALUES (?, ?, 'USDT', 'Tether USD', ?, ?, FALSE)
          `, [coinId, network.id, usdt.decimals, usdt.contract]);
        }
      }
      console.log("Seeded USDT coins for major networks");

      // Seed TON-specific tokens (NOT, DOGS)
      const tonNetwork = networkRows.find((n: any) => n.code === 'TON');
      if (tonNetwork) {
        const tonTokens = [
          { symbol: 'NOT', name: 'Notcoin', decimals: 9, contract: 'EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT' },
          { symbol: 'DOGS', name: 'Dogs', decimals: 9, contract: 'EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS' },
        ];
        
        for (const token of tonTokens) {
          const coinId = crypto.randomUUID();
          await connection.query(`
            INSERT INTO crypto_coins (id, network_id, symbol, name, decimals, contract_address, is_native)
            VALUES (?, ?, ?, ?, ?, ?, FALSE)
          `, [coinId, tonNetwork.id, token.symbol, token.name, token.decimals, token.contract]);
        }
        console.log("Seeded TON tokens (NOT, DOGS)");
      }
    }
  } catch (error: any) {
    console.log("Error seeding crypto networks:", error.message);
  }

  // ==================== Widget System Tables ====================
  
  // Grid Presets table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS grid_presets (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        columns INT NOT NULL DEFAULT 12,
        slots JSON NOT NULL,
        breakpoints JSON,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Grid presets table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Grid presets table already exists");
    } else {
      console.error("Error initializing grid_presets table:", error);
    }
  }

  // Widgets Catalog table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS widgets_catalog (
        id VARCHAR(36) PRIMARY KEY,
        \`key\` VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        min_width INT DEFAULT 1,
        min_height INT DEFAULT 1,
        max_width INT,
        max_height INT,
        supported_sizes JSON,
        endpoint VARCHAR(255),
        component_key VARCHAR(100) NOT NULL,
        default_config JSON,
        is_active BOOLEAN DEFAULT TRUE,
        \`order\` INT DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Widgets catalog table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("Widgets catalog table already exists");
    } else {
      console.error("Error initializing widgets_catalog table:", error);
    }
  }

  // User Widget Layouts table
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_widget_layouts (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        preset_id VARCHAR(36) NOT NULL,
        slots_mapping JSON NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX layout_user_id_idx (user_id),
        CONSTRAINT fk_layout_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_layout_preset FOREIGN KEY (preset_id) REFERENCES grid_presets(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("User widget layouts table initialized");
  } catch (error: any) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.errno === 1050) {
      console.log("User widget layouts table already exists");
    } else {
      console.error("Error initializing user_widget_layouts table:", error);
    }
  }

  // Seed Grid Presets
  try {
    const [existingPresets]: any = await connection.query(`SELECT COUNT(*) as count FROM grid_presets`);
    if (existingPresets[0].count === 0) {
      const presets = [
        {
          id: crypto.randomUUID(),
          name: '4 квадрата',
          description: 'Простая сетка 2x2 для базового дашборда',
          columns: 12,
          slots: JSON.stringify([
            { slotId: 's1', x: 0, y: 0, w: 6, h: 2 },
            { slotId: 's2', x: 6, y: 0, w: 6, h: 2 },
            { slotId: 's3', x: 0, y: 2, w: 6, h: 2 },
            { slotId: 's4', x: 6, y: 2, w: 6, h: 2 },
          ]),
          isDefault: true,
          order: 1
        },
        {
          id: crypto.randomUUID(),
          name: '4 + 6 блоков',
          description: '4 блока сверху, 6 снизу',
          columns: 12,
          slots: JSON.stringify([
            { slotId: 's1', x: 0, y: 0, w: 3, h: 2 },
            { slotId: 's2', x: 3, y: 0, w: 3, h: 2 },
            { slotId: 's3', x: 6, y: 0, w: 3, h: 2 },
            { slotId: 's4', x: 9, y: 0, w: 3, h: 2 },
            { slotId: 's5', x: 0, y: 2, w: 4, h: 2 },
            { slotId: 's6', x: 4, y: 2, w: 4, h: 2 },
            { slotId: 's7', x: 8, y: 2, w: 4, h: 2 },
            { slotId: 's8', x: 0, y: 4, w: 4, h: 2 },
            { slotId: 's9', x: 4, y: 4, w: 4, h: 2 },
            { slotId: 's10', x: 8, y: 4, w: 4, h: 2 },
          ]),
          isDefault: false,
          order: 2
        },
        {
          id: crypto.randomUUID(),
          name: 'Большой + боковая панель',
          description: 'Большой виджет слева, 3 маленьких справа',
          columns: 12,
          slots: JSON.stringify([
            { slotId: 's1', x: 0, y: 0, w: 8, h: 4 },
            { slotId: 's2', x: 8, y: 0, w: 4, h: 1 },
            { slotId: 's3', x: 8, y: 1, w: 4, h: 1 },
            { slotId: 's4', x: 8, y: 2, w: 4, h: 2 },
          ]),
          isDefault: false,
          order: 3
        },
        {
          id: crypto.randomUUID(),
          name: '3 колонки',
          description: 'Три равные колонки',
          columns: 12,
          slots: JSON.stringify([
            { slotId: 's1', x: 0, y: 0, w: 4, h: 4 },
            { slotId: 's2', x: 4, y: 0, w: 4, h: 4 },
            { slotId: 's3', x: 8, y: 0, w: 4, h: 4 },
          ]),
          isDefault: false,
          order: 4
        },
        {
          id: crypto.randomUUID(),
          name: 'Фокус',
          description: 'Один большой блок для максимального фокуса',
          columns: 12,
          slots: JSON.stringify([
            { slotId: 's1', x: 0, y: 0, w: 12, h: 4 },
          ]),
          isDefault: false,
          order: 5
        }
      ];

      for (const preset of presets) {
        await connection.query(`
          INSERT INTO grid_presets (id, name, description, columns, slots, is_default, \`order\`)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [preset.id, preset.name, preset.description, preset.columns, preset.slots, preset.isDefault, preset.order]);
      }
      console.log("Seeded 5 grid presets");
    }
  } catch (error: any) {
    console.log("Error seeding grid presets:", error.message);
  }

  // Seed Widgets Catalog
  try {
    const [existingWidgets]: any = await connection.query(`SELECT COUNT(*) as count FROM widgets_catalog`);
    if (existingWidgets[0].count === 0) {
      const widgets = [
        { key: 'balance', title: 'Баланс', description: 'Показывает текущий баланс пользователя', icon: 'Wallet', componentKey: 'BalanceWidget', endpoint: '/api/widgets/balance', minWidth: 2, minHeight: 1, order: 1 },
        { key: 'transactions', title: 'История операций', description: 'Последние транзакции', icon: 'History', componentKey: 'TransactionsWidget', endpoint: '/api/widgets/transactions', minWidth: 3, minHeight: 2, order: 2 },
        { key: 'stats', title: 'Статистика', description: 'Общая статистика активности', icon: 'BarChart3', componentKey: 'StatsWidget', endpoint: '/api/widgets/stats', minWidth: 2, minHeight: 2, order: 3 },
        { key: 'achievements', title: 'Достижения', description: 'Ваши достижения и награды', icon: 'Trophy', componentKey: 'AchievementsWidget', endpoint: '/api/widgets/achievements', minWidth: 2, minHeight: 2, order: 4 },
        { key: 'news', title: 'Новости', description: 'Последние новости и обновления', icon: 'Newspaper', componentKey: 'NewsWidget', endpoint: '/api/widgets/news', minWidth: 3, minHeight: 2, order: 5 },
        { key: 'quickActions', title: 'Быстрые действия', description: 'Часто используемые действия', icon: 'Zap', componentKey: 'QuickActionsWidget', endpoint: null, minWidth: 2, minHeight: 1, order: 6 },
        { key: 'referrals', title: 'Рефералы', description: 'Статистика рефералов', icon: 'Users', componentKey: 'ReferralsWidget', endpoint: '/api/widgets/referrals', minWidth: 2, minHeight: 2, order: 7 },
        { key: 'calendar', title: 'Календарь', description: 'Предстоящие события', icon: 'Calendar', componentKey: 'CalendarWidget', endpoint: '/api/widgets/calendar', minWidth: 3, minHeight: 2, order: 8 },
        { key: 'notes', title: 'Заметки', description: 'Быстрые заметки', icon: 'StickyNote', componentKey: 'NotesWidget', endpoint: '/api/widgets/notes', minWidth: 2, minHeight: 2, order: 9 },
        { key: 'tasks', title: 'Задачи', description: 'Список задач', icon: 'CheckSquare', componentKey: 'TasksWidget', endpoint: '/api/widgets/tasks', minWidth: 2, minHeight: 2, order: 10 },
      ];

      for (const widget of widgets) {
        const id = crypto.randomUUID();
        await connection.query(`
          INSERT INTO widgets_catalog (id, \`key\`, title, description, icon, component_key, endpoint, min_width, min_height, \`order\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, widget.key, widget.title, widget.description, widget.icon, widget.componentKey, widget.endpoint, widget.minWidth, widget.minHeight, widget.order]);
      }
      console.log("Seeded 10 widgets in catalog");
    }
  } catch (error: any) {
    console.log("Error seeding widgets catalog:", error.message);
  }
}
