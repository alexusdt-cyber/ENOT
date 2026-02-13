-- Notification System Tables

-- Notification Categories
CREATE TABLE IF NOT EXISTS notification_categories (
  id VARCHAR(36) PRIMARY KEY,
  `key` VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#6366f1',
  `order` INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX notification_category_key_idx (`key`)
);

-- Notification Types
CREATE TABLE IF NOT EXISTS notification_types (
  id VARCHAR(36) PRIMARY KEY,
  category_id VARCHAR(36) NOT NULL,
  `key` VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_title VARCHAR(255),
  default_body TEXT,
  severity ENUM('info', 'success', 'warning', 'urgent') DEFAULT 'info',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX notification_type_category_id_idx (category_id),
  INDEX notification_type_key_idx (`key`),
  FOREIGN KEY (category_id) REFERENCES notification_categories(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  category_id VARCHAR(36) NOT NULL,
  type_id VARCHAR(36),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  status ENUM('unread', 'read', 'archived') DEFAULT 'unread',
  source_type ENUM('task', 'note', 'milestone', 'roadmap', 'other'),
  source_id VARCHAR(36),
  metadata TEXT,
  action_url TEXT,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX notification_user_id_idx (user_id),
  INDEX notification_category_id_idx (category_id),
  INDEX notification_status_idx (status),
  INDEX notification_created_at_idx (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES notification_categories(id) ON DELETE CASCADE,
  FOREIGN KEY (type_id) REFERENCES notification_types(id) ON DELETE SET NULL
);

-- Seed initial notification categories
INSERT INTO notification_categories (id, `key`, name, description, icon, color, `order`) VALUES
  (UUID(), 'tasks', 'Задачи', 'Уведомления о задачах и напоминаниях', 'CheckSquare', '#f59e0b', 1),
  (UUID(), 'notes', 'Блокноты', 'Уведомления о заметках и чек-листах', 'FileText', '#3b82f6', 2),
  (UUID(), 'roadmap', 'Дорожная карта', 'Уведомления о вехах и прогрессе', 'Map', '#10b981', 3);

-- Seed notification types
INSERT INTO notification_types (id, category_id, `key`, name, description, default_title, severity) VALUES
  (UUID(), (SELECT id FROM notification_categories WHERE `key` = 'tasks'), 'task_due_soon', 'Задача скоро истекает', 'Напоминание за час до срока', 'Напоминание о задаче', 'warning'),
  (UUID(), (SELECT id FROM notification_categories WHERE `key` = 'notes'), 'tasklist_due_soon', 'Чек-лист скоро истекает', 'Напоминание о времени в чек-листе', 'Напоминание о чек-листе', 'info'),
  (UUID(), (SELECT id FROM notification_categories WHERE `key` = 'roadmap'), 'milestone_completed', 'Веха выполнена', 'Поздравление с выполнением вехи', 'Поздравляем!', 'success');
