-- MySQL Initial Schema Migration
-- Create all tables for Notes application with authentication support

-- Users table with multi-auth support
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(50),
  `order` INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX category_user_id_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notes table with rich content support
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX note_user_id_idx (user_id),
  INDEX note_category_id_idx (category_id),
  UNIQUE INDEX share_token_idx (share_token),
  INDEX created_at_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note sharing permissions
CREATE TABLE IF NOT EXISTS note_shares (
  id VARCHAR(36) PRIMARY KEY,
  note_id VARCHAR(36) NOT NULL,
  shared_with_user_id VARCHAR(36),
  permission ENUM('view', 'comment', 'edit') NOT NULL DEFAULT 'view',
  share_link VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(36) NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX share_note_id_idx (note_id),
  INDEX shared_with_idx (shared_with_user_id),
  UNIQUE INDEX share_link_idx (share_link)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attachments table for images and files
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
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX attachment_note_id_idx (note_id),
  INDEX attachment_user_id_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess LONGTEXT NOT NULL,
  expire TIMESTAMP NOT NULL,
  INDEX expire_idx (expire)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
