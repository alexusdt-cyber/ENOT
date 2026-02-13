import { sql } from "drizzle-orm";
import { 
  mysqlTable, 
  varchar, 
  text, 
  timestamp, 
  int,
  longtext,
  boolean,
  mysqlEnum,
  index,
  uniqueIndex,
  json,
  decimal
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).unique(),
  username: varchar("username", { length: 100 }),
  password: text("password"),
  
  googleId: varchar("google_id", { length: 255 }).unique(),
  telegramId: varchar("telegram_id", { length: 255 }).unique(),
  
  displayName: varchar("display_name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  
  authMethod: mysqlEnum("auth_method", ["email", "google", "telegram"]).notNull(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  googleIdIdx: index("google_id_idx").on(table.googleId),
  telegramIdIdx: index("telegram_id_idx").on(table.telegramId),
}));

export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }),
  order: int("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("category_user_id_idx").on(table.userId),
}));

export const notes = mysqlTable("notes", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 36 }).references(() => categories.id, { onDelete: "set null" }),
  
  title: varchar("title", { length: 255 }).notNull(),
  content: longtext("content").notNull(),
  contentType: mysqlEnum("content_type", ["markdown", "html", "rich_text"]).default("rich_text"),
  
  tags: text("tags"),
  isPinned: boolean("is_pinned").default(false),
  isFavorite: boolean("is_favorite").default(false),
  
  isPublic: boolean("is_public").default(false),
  shareToken: varchar("share_token", { length: 64 }).unique(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  lastAccessedAt: timestamp("last_accessed_at"),
}, (table) => ({
  userIdIdx: index("note_user_id_idx").on(table.userId),
  categoryIdIdx: index("note_category_id_idx").on(table.categoryId),
  shareTokenIdx: uniqueIndex("share_token_idx").on(table.shareToken),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export const noteShares = mysqlTable("note_shares", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  noteId: varchar("note_id", { length: 36 }).notNull().references(() => notes.id, { onDelete: "cascade" }),
  sharedWithUserId: varchar("shared_with_user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  
  permission: mysqlEnum("permission", ["view", "comment", "edit"]).notNull().default("view"),
  shareType: mysqlEnum("share_type", ["password", "view_only", "can_edit"]).notNull().default("view_only"),
  password: varchar("password", { length: 255 }),
  
  shareLink: varchar("share_link", { length: 255 }).unique(),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
}, (table) => ({
  noteIdIdx: index("share_note_id_idx").on(table.noteId),
  sharedWithIdx: index("shared_with_idx").on(table.sharedWithUserId),
  shareLinkIdx: uniqueIndex("share_link_idx").on(table.shareLink),
}));

export const attachments = mysqlTable("attachments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  noteId: varchar("note_id", { length: 36 }).notNull().references(() => notes.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: int("file_size").notNull(),
  
  url: text("url").notNull(),
  
  width: int("width"),
  height: int("height"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  noteIdIdx: index("attachment_note_id_idx").on(table.noteId),
  userIdIdx: index("attachment_user_id_idx").on(table.userId),
}));

export const sessions = mysqlTable("sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: longtext("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => ({
  expireIdx: index("expire_idx").on(table.expire),
}));

export const taskCategories = mysqlTable("task_categories", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("task_category_user_id_idx").on(table.userId),
}));

export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 36 }).references(() => taskCategories.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium"),
  sticker: varchar("sticker", { length: 10 }),
  completed: boolean("completed").default(false),
  dueDate: timestamp("due_date"),
  order: int("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index("task_user_id_idx").on(table.userId),
  categoryIdIdx: index("task_category_id_idx").on(table.categoryId),
}));

export const subtasks = mysqlTable("subtasks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: varchar("task_id", { length: 36 }).notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 1000 }).notNull(),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  taskIdIdx: index("subtask_task_id_idx").on(table.taskId),
}));

export const goals = mysqlTable("goals", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  images: json("images").$type<string[]>().default([]),
  price: int("price"),
  completed: boolean("completed").default(false),
  order: int("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index("goal_user_id_idx").on(table.userId),
}));

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email().optional(),
  username: z.string().min(3).max(100).optional(),
  password: z.string().min(6).optional(),
  displayName: z.string().min(1).max(255).optional(),
  authMethod: z.enum(["email", "google", "telegram"]),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const insertCategorySchema = createInsertSchema(categories, {
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().max(50).optional(),
}).omit({ id: true, createdAt: true });

export const insertNoteSchema = createInsertSchema(notes, {
  title: z.string().min(1).max(255),
  content: z.string(),
  contentType: z.enum(["markdown", "html", "rich_text"]).optional(),
  tags: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
}).omit({ id: true, createdAt: true, updatedAt: true, lastAccessedAt: true, shareToken: true });

export const updateNoteSchema = insertNoteSchema.partial();

export const insertNoteShareSchema = createInsertSchema(noteShares, {
  noteId: z.string().uuid(),
  sharedWithUserId: z.string().uuid().optional().nullable(),
  permission: z.enum(["view", "comment", "edit"]),
  shareType: z.enum(["password", "view_only", "can_edit"]),
  password: z.string().optional().nullable(),
  expiresAt: z.date().optional().nullable(),
}).omit({ id: true, createdAt: true, shareLink: true });

export const insertAttachmentSchema = createInsertSchema(attachments, {
  noteId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
  url: z.string().url(),
}).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Login = z.infer<typeof loginSchema>;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type UpdateNote = z.infer<typeof updateNoteSchema>;
export type Note = typeof notes.$inferSelect;

export type InsertNoteShare = z.infer<typeof insertNoteShareSchema>;
export type NoteShare = typeof noteShares.$inferSelect;

export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

export const insertTaskCategorySchema = createInsertSchema(taskCategories, {
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().max(50).optional(),
}).omit({ id: true, createdAt: true });

export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1).max(255),
  categoryId: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  sticker: z.string().max(10).optional().nullable(),
  dueDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional().nullable()
  ),
  order: z.number().int().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateTaskSchema = insertTaskSchema.partial();

export const insertSubtaskSchema = createInsertSchema(subtasks, {
  title: z.string().min(1).max(1000),
}).omit({ id: true, createdAt: true });

export type InsertTaskCategory = z.infer<typeof insertTaskCategorySchema>;
export type TaskCategory = typeof taskCategories.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;
export type Subtask = typeof subtasks.$inferSelect;

export const insertGoalSchema = createInsertSchema(goals, {
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  price: z.number().int().optional().nullable(),
  completed: z.boolean().optional(),
  order: z.number().int().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateGoalSchema = insertGoalSchema.partial();

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type UpdateGoal = z.infer<typeof updateGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export const folders = mysqlTable("folders", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 7 }).default("#3B82F6"),
  parentId: varchar("parent_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index("folder_user_id_idx").on(table.userId),
  parentIdIdx: index("folder_parent_id_idx").on(table.parentId),
}));

export const files = mysqlTable("files", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  folderId: varchar("folder_id", { length: 36 }).notNull().references(() => folders.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: int("size").notNull(),
  fileType: mysqlEnum("file_type", ["image", "document", "video", "audio", "code", "archive", "other"]).default("other"),
  path: text("path").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index("file_user_id_idx").on(table.userId),
  folderIdIdx: index("file_folder_id_idx").on(table.folderId),
}));

export const insertFolderSchema = createInsertSchema(folders, {
  name: z.string().min(1).max(255),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  parentId: z.string().uuid().optional().nullable(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateFolderSchema = insertFolderSchema.partial();

export const insertFileSchema = createInsertSchema(files, {
  name: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().positive(),
  fileType: z.enum(["image", "document", "video", "audio", "code", "archive", "other"]).optional(),
  path: z.string(),
  url: z.string(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().optional(),
});

export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type UpdateFolder = z.infer<typeof updateFolderSchema>;
export type Folder = typeof folders.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type UpdateFile = z.infer<typeof updateFileSchema>;
export type DbFile = typeof files.$inferSelect;

export const roadmapCategories = mysqlTable("roadmap_categories", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("roadmap_category_user_id_idx").on(table.userId),
}));

export const roadmaps = mysqlTable("roadmaps", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 36 }).references(() => roadmapCategories.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  notebook: varchar("notebook", { length: 255 }).default(""),
  targetDate: timestamp("target_date"),
  pinned: boolean("pinned").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index("roadmap_user_id_idx").on(table.userId),
  categoryIdIdx: index("roadmap_category_id_idx").on(table.categoryId),
}));

export const milestones = mysqlTable("milestones", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  roadmapId: varchar("roadmap_id", { length: 36 }).notNull().references(() => roadmaps.id, { onDelete: "cascade" }),
  year: int("year").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  completed: boolean("completed").default(false),
  date: timestamp("date"),
  order: int("order").default(0),
  images: text("images"),
  pdfFiles: text("pdf_files"),
  videos: text("videos"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  roadmapIdIdx: index("milestone_roadmap_id_idx").on(table.roadmapId),
}));

export const insertRoadmapCategorySchema = createInsertSchema(roadmapCategories, {
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().max(50).optional(),
}).omit({ id: true, createdAt: true });

export type InsertRoadmapCategory = z.infer<typeof insertRoadmapCategorySchema>;
export type RoadmapCategory = typeof roadmapCategories.$inferSelect;

export const insertRoadmapSchema = createInsertSchema(roadmaps, {
  title: z.string().min(1).max(255),
  notebook: z.string().max(255).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  targetDate: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional().nullable()
  ),
  pinned: z.boolean().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateRoadmapSchema = insertRoadmapSchema.partial();

export const insertMilestoneSchema = createInsertSchema(milestones, {
  year: z.number().int(),
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  completed: z.boolean().optional(),
  date: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date().optional().nullable()
  ),
  order: z.number().int().optional(),
  images: z.string().optional().nullable(),
  pdfFiles: z.string().optional().nullable(),
  videos: z.string().optional().nullable(),
}).omit({ id: true, createdAt: true });

export const updateMilestoneSchema = insertMilestoneSchema.partial();

export type InsertRoadmap = z.infer<typeof insertRoadmapSchema>;
export type UpdateRoadmap = z.infer<typeof updateRoadmapSchema>;
export type Roadmap = typeof roadmaps.$inferSelect;

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type UpdateMilestone = z.infer<typeof updateMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

export const downloadTokens = mysqlTable("download_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  filePath: text("file_path").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  downloadCount: int("download_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex("download_token_idx").on(table.token),
  userIdIdx: index("download_token_user_id_idx").on(table.userId),
}));

export const insertDownloadTokenSchema = createInsertSchema(downloadTokens, {
  token: z.string().min(1).max(64),
  filePath: z.string().min(1),
  fileName: z.string().min(1).max(255),
}).omit({ id: true, createdAt: true, downloadCount: true });

export type InsertDownloadToken = z.infer<typeof insertDownloadTokenSchema>;
export type DownloadToken = typeof downloadTokens.$inferSelect;

// Link Center - Categories for organizing links
export const linkCategories = mysqlTable("link_categories", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }).default("Folder"),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  order: int("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("link_category_user_id_idx").on(table.userId),
}));

// Link Center - Links with auto-fetched metadata
export const links = mysqlTable("links", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 36 }).notNull().references(() => linkCategories.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: varchar("title", { length: 500 }),
  description: text("description"),
  favicon: text("favicon"),
  image: text("image"),
  order: int("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index("link_user_id_idx").on(table.userId),
  categoryIdIdx: index("link_category_id_idx").on(table.categoryId),
}));

export const insertLinkCategorySchema = createInsertSchema(linkCategories, {
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  order: z.number().int().optional(),
}).omit({ id: true, createdAt: true });

export const insertLinkSchema = createInsertSchema(links, {
  url: z.string().url().min(1),
  title: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  order: z.number().int().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateLinkSchema = insertLinkSchema.partial();

export type InsertLinkCategory = z.infer<typeof insertLinkCategorySchema>;
export type LinkCategory = typeof linkCategories.$inferSelect;

export type InsertLink = z.infer<typeof insertLinkSchema>;
export type UpdateLink = z.infer<typeof updateLinkSchema>;
export type Link = typeof links.$inferSelect;

// Notification System - Categories for organizing notifications
export const notificationCategories = mysqlTable("notification_categories", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  order: int("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  keyIdx: uniqueIndex("notification_category_key_idx").on(table.key),
}));

// Notification System - Types of notifications within categories
export const notificationTypes = mysqlTable("notification_types", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  categoryId: varchar("category_id", { length: 36 }).notNull().references(() => notificationCategories.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 50 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  defaultTitle: varchar("default_title", { length: 255 }),
  defaultBody: text("default_body"),
  severity: mysqlEnum("severity", ["info", "success", "warning", "urgent"]).default("info"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  categoryIdIdx: index("notification_type_category_id_idx").on(table.categoryId),
  keyIdx: index("notification_type_key_idx").on(table.key),
}));

// Notification System - User notifications
export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 36 }).notNull().references(() => notificationCategories.id, { onDelete: "cascade" }),
  typeId: varchar("type_id", { length: 36 }).references(() => notificationTypes.id, { onDelete: "set null" }),
  
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  
  status: mysqlEnum("status", ["unread", "read", "archived"]).default("unread"),
  
  // Polymorphic reference to source entity
  sourceType: mysqlEnum("source_type", ["task", "note", "milestone", "roadmap", "other"]),
  sourceId: varchar("source_id", { length: 36 }),
  
  // Additional metadata as JSON
  metadata: text("metadata"),
  
  // Action URL for "View" button
  actionUrl: text("action_url"),
  
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("notification_user_id_idx").on(table.userId),
  categoryIdIdx: index("notification_category_id_idx").on(table.categoryId),
  statusIdx: index("notification_status_idx").on(table.status),
  createdAtIdx: index("notification_created_at_idx").on(table.createdAt),
}));

export const insertNotificationCategorySchema = createInsertSchema(notificationCategories, {
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  order: z.number().int().optional(),
}).omit({ id: true, createdAt: true });

export const insertNotificationTypeSchema = createInsertSchema(notificationTypes, {
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  defaultTitle: z.string().max(255).optional(),
  defaultBody: z.string().optional(),
}).omit({ id: true, createdAt: true });

export const insertNotificationSchema = createInsertSchema(notifications, {
  title: z.string().min(1).max(255),
  body: z.string().optional(),
  sourceId: z.string().max(36).optional(),
  metadata: z.string().optional(),
  actionUrl: z.string().optional(),
}).omit({ id: true, createdAt: true, readAt: true });

export type InsertNotificationCategory = z.infer<typeof insertNotificationCategorySchema>;
export type NotificationCategory = typeof notificationCategories.$inferSelect;

export type InsertNotificationType = z.infer<typeof insertNotificationTypeSchema>;
export type NotificationType = typeof notificationTypes.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ==================== APP STORE ====================

export const appCategories = mysqlTable("app_categories", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  order: int("order").default(0),
  appType: varchar("app_type", { length: 20 }).default("internal").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type UrlPathPattern = {
  patternType: "prefix" | "exact" | "regex";
  value: string;
  description?: string;
};

export type AllowedNavigationOrigin = {
  origin: string;
  purpose: "app" | "cdn" | "oauth" | "assets" | "api" | "other";
  pathPatterns?: UrlPathPattern[];
};

export const apps = mysqlTable("apps", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  categoryId: varchar("category_id", { length: 36 }).references(() => appCategories.id, { onDelete: "set null" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 255 }),
  icon: text("icon"),
  screenshots: json("screenshots").$type<string[]>().default([]),
  developer: varchar("developer", { length: 100 }),
  version: varchar("version", { length: 20 }),
  size: varchar("size", { length: 20 }),
  rating: int("rating").default(0),
  downloads: int("downloads").default(0),
  price: int("price").default(0),
  launchUrl: text("launch_url"),
  featured: boolean("featured").default(false),
  appType: varchar("app_type", { length: 20 }).default("internal").notNull(),
  launchMode: varchar("launch_mode", { length: 20 }).default("external").notNull(),
  componentKey: varchar("component_key", { length: 50 }),
  
  origin: varchar("origin", { length: 255 }),
  allowedOrigins: json("allowed_origins").$type<string[]>().default([]),
  allowedPostMessageOrigins: json("allowed_post_message_origins").$type<string[]>().default([]),
  allowedStartUrlPatterns: json("allowed_start_url_patterns").$type<UrlPathPattern[]>().default([]),
  allowedNavigationOrigins: json("allowed_navigation_origins").$type<AllowedNavigationOrigin[]>().default([]),
  scopes: json("scopes").$type<string[]>().default([]),
  ssoMode: varchar("sso_mode", { length: 30 }).default("postMessageTicket"),
  status: varchar("status", { length: 20 }).default("active"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  categoryIdIdx: index("app_category_id_idx").on(table.categoryId),
  featuredIdx: index("app_featured_idx").on(table.featured),
  appTypeIdx: index("app_type_idx").on(table.appType),
  statusIdx: index("app_status_idx").on(table.status),
}));

export const userApps = mysqlTable("user_apps", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  appId: varchar("app_id", { length: 36 }).notNull().references(() => apps.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  lastLaunchedAt: timestamp("last_launched_at"),
  isFavorite: boolean("is_favorite").default(false),
}, (table) => ({
  userIdIdx: index("user_app_user_id_idx").on(table.userId),
  appIdIdx: index("user_app_app_id_idx").on(table.appId),
  userAppIdx: uniqueIndex("user_app_unique_idx").on(table.userId, table.appId),
}));

export const appReviews = mysqlTable("app_reviews", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  appId: varchar("app_id", { length: 36 }).notNull().references(() => apps.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: int("rating").notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  appIdIdx: index("review_app_id_idx").on(table.appId),
  userIdIdx: index("review_user_id_idx").on(table.userId),
}));

export const miniAppSessions = mysqlTable("miniapp_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  appId: varchar("app_id", { length: 36 }).notNull().references(() => apps.id, { onDelete: "cascade" }),
  sessionNonce: varchar("session_nonce", { length: 64 }).notNull().unique(),
  appOrigin: varchar("app_origin", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("miniapp_session_user_id_idx").on(table.userId),
  appIdIdx: index("miniapp_session_app_id_idx").on(table.appId),
  nonceIdx: uniqueIndex("miniapp_session_nonce_idx").on(table.sessionNonce),
  expiresAtIdx: index("miniapp_session_expires_idx").on(table.expiresAt),
}));

export const ssoTickets = mysqlTable("sso_tickets", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  jti: varchar("jti", { length: 64 }).notNull().unique(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  appId: varchar("app_id", { length: 36 }).notNull().references(() => apps.id, { onDelete: "cascade" }),
  used: boolean("used").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  jtiIdx: uniqueIndex("sso_ticket_jti_idx").on(table.jti),
  userIdIdx: index("sso_ticket_user_id_idx").on(table.userId),
  appIdIdx: index("sso_ticket_app_id_idx").on(table.appId),
  expiresAtIdx: index("sso_ticket_expires_idx").on(table.expiresAt),
}));

// App Store Insert Schemas
export const insertAppCategorySchema = createInsertSchema(appCategories, {
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  order: z.number().int().optional(),
  appType: z.enum(["internal", "telegram"]).default("internal"),
}).omit({ id: true, createdAt: true });

export const urlPathPatternSchema = z.object({
  patternType: z.enum(["prefix", "exact", "regex"]),
  value: z.string().min(1).max(512),
  description: z.string().max(200).optional(),
});

export const allowedNavigationOriginSchema = z.object({
  origin: z.string().regex(/^https?:\/\/[a-zA-Z0-9.-]+(?::\d{2,5})?$/),
  purpose: z.enum(["app", "cdn", "oauth", "assets", "api", "other"]),
  pathPatterns: z.array(urlPathPatternSchema).optional(),
});

export const insertAppSchema = createInsertSchema(apps, {
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  shortDescription: z.string().max(255).optional(),
  icon: z.string().optional(),
  screenshots: z.array(z.string()).optional(),
  developer: z.string().max(100).optional(),
  version: z.string().max(20).optional(),
  size: z.string().max(20).optional(),
  rating: z.number().int().min(0).max(5).optional(),
  downloads: z.number().int().optional(),
  price: z.number().int().optional(),
  launchUrl: z.string().optional(),
  featured: z.boolean().optional(),
  appType: z.enum(["internal", "telegram", "external"]).default("internal"),
  launchMode: z.enum(["external", "modal", "iframe"]).default("external"),
  componentKey: z.string().max(50).optional(),
  origin: z.string().max(255).optional(),
  allowedOrigins: z.array(z.string()).optional(),
  allowedPostMessageOrigins: z.array(z.string()).optional(),
  allowedStartUrlPatterns: z.array(urlPathPatternSchema).optional(),
  allowedNavigationOrigins: z.array(allowedNavigationOriginSchema).optional(),
  scopes: z.array(z.string()).optional(),
  ssoMode: z.enum(["postMessageTicket", "oidcRedirect", "hybrid"]).default("postMessageTicket"),
  status: z.enum(["active", "beta", "disabled"]).default("active"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertUserAppSchema = createInsertSchema(userApps, {
  isFavorite: z.boolean().optional(),
}).omit({ id: true, addedAt: true, lastLaunchedAt: true });

export const insertAppReviewSchema = createInsertSchema(appReviews, {
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  content: z.string().optional(),
}).omit({ id: true, createdAt: true });

// App Store Types
export type InsertAppCategory = z.infer<typeof insertAppCategorySchema>;
export type AppCategory = typeof appCategories.$inferSelect;

export type InsertApp = z.infer<typeof insertAppSchema>;
export type App = typeof apps.$inferSelect;

export type InsertUserApp = z.infer<typeof insertUserAppSchema>;
export type UserApp = typeof userApps.$inferSelect;

export type InsertAppReview = z.infer<typeof insertAppReviewSchema>;
export type AppReview = typeof appReviews.$inferSelect;

export type MiniAppSession = typeof miniAppSessions.$inferSelect;
export type InsertMiniAppSession = typeof miniAppSessions.$inferInsert;

export type SsoTicket = typeof ssoTickets.$inferSelect;
export type InsertSsoTicket = typeof ssoTickets.$inferInsert;

// ==================== MY MEMORY MAP MODULE ====================

export type MemoryMapBlock = 
  | { id: string; type: "text"; content: string }
  | { id: string; type: "gallery"; mediaIds: string[] };

export const memoryMapMarkers = mysqlTable("memory_map_markers", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: varchar("owner_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  lat: decimal("lat", { precision: 10, scale: 6 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 6 }).notNull(),
  eventDate: timestamp("event_date"),
  icon: varchar("icon", { length: 10 }).default("📍"),
  color: varchar("color", { length: 7 }).default("#ef4444"),
  tags: json("tags").$type<string[]>().default([]),
  blocks: json("blocks").$type<MemoryMapBlock[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  ownerIdIdx: index("marker_owner_id_idx").on(table.ownerId),
  coordsIdx: index("marker_coords_idx").on(table.lat, table.lng),
}));

export const memoryMapMedia = mysqlTable("memory_map_media", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  markerId: varchar("marker_id", { length: 36 }).notNull().references(() => memoryMapMarkers.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["photo", "video", "file"]).notNull().default("photo"),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: int("size").notNull(),
  storagePath: text("storage_path").notNull(),
  url: text("url"),
  fileId: varchar("file_id", { length: 36 }).references(() => files.id, { onDelete: "set null" }),
  orderIndex: int("order_index").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  markerIdIdx: index("media_marker_id_idx").on(table.markerId),
  fileIdIdx: index("media_file_id_idx").on(table.fileId),
}));

export const memoryMapAccess = mysqlTable("memory_map_access", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  markerId: varchar("marker_id", { length: 36 }).notNull().references(() => memoryMapMarkers.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["viewer", "editor"]).notNull().default("viewer"),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
}, (table) => ({
  markerIdIdx: index("access_marker_id_idx").on(table.markerId),
  userIdIdx: index("access_user_id_idx").on(table.userId),
  markerUserIdx: uniqueIndex("access_marker_user_idx").on(table.markerId, table.userId),
}));

export const memoryMapBlockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("text"), content: z.string() }),
  z.object({ id: z.string(), type: z.literal("gallery"), mediaIds: z.array(z.string()) }),
  z.object({ id: z.string(), type: z.literal("files"), fileIds: z.array(z.string()) }),
]);
export type MemoryMapBlock = z.infer<typeof memoryMapBlockSchema>;

export const insertMemoryMapMarkerSchema = createInsertSchema(memoryMapMarkers, {
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  eventDate: z.string().optional().transform(val => val ? new Date(val) : null),
  icon: z.string().max(10).optional(),
  color: z.string().max(7).optional(),
  tags: z.array(z.string()).optional(),
  blocks: z.array(memoryMapBlockSchema).optional(),
}).omit({ id: true, ownerId: true, createdAt: true, updatedAt: true });

export const insertMemoryMapMediaSchema = createInsertSchema(memoryMapMedia, {
  type: z.enum(["photo", "video", "file"]),
  filename: z.string().max(255),
  originalName: z.string().max(255),
  mimeType: z.string().max(100),
  size: z.number().int(),
  storagePath: z.string(),
  url: z.string().optional(),
  fileId: z.string().uuid().optional(),
  orderIndex: z.number().int().optional(),
}).omit({ id: true, createdAt: true });

export const insertMemoryMapAccessSchema = createInsertSchema(memoryMapAccess, {
  role: z.enum(["viewer", "editor"]).default("viewer"),
}).omit({ id: true, grantedAt: true });

// My Memory Map Types
export type InsertMemoryMapMarker = z.infer<typeof insertMemoryMapMarkerSchema>;
export type MemoryMapMarker = typeof memoryMapMarkers.$inferSelect;

export type InsertMemoryMapMedia = z.infer<typeof insertMemoryMapMediaSchema>;
export type MemoryMapMedia = typeof memoryMapMedia.$inferSelect;

export type InsertMemoryMapAccess = z.infer<typeof insertMemoryMapAccessSchema>;
export type MemoryMapAccess = typeof memoryMapAccess.$inferSelect;

// ==================== BALANCES MODULE ====================

export const balances = mysqlTable("balances", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }),
  paysystem: varchar("paysystem", { length: 255 }),
  currency: varchar("currency", { length: 20 }),
  rate: decimal("rate", { precision: 20, scale: 10 }).notNull().default("0.0000000000"),
  minpay: decimal("minpay", { precision: 20, scale: 10 }).notNull().default("0.0000000000"),
  maxpay: decimal("maxpay", { precision: 20, scale: 10 }).notNull().default("0.0000000000"),
  minpayout: decimal("minpayout", { precision: 20, scale: 10 }).notNull().default("0.0000000000"),
  maxpayout: decimal("maxpayout", { precision: 20, scale: 10 }).notNull().default("0.0000000000"),
  type: int("type").notNull().default(1),
  status: int("status").notNull().default(0),
}, (table) => ({
  currencyIdx: index("balance_currency_idx").on(table.currency),
}));

export const usersBalances = mysqlTable("users_balances", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  balanceId: int("balance_id").notNull().references(() => balances.id, { onDelete: "cascade" }),
  sum: decimal("sum", { precision: 20, scale: 10 }).notNull().default("0.0000000000"),
  statSum: decimal("stat_sum", { precision: 20, scale: 10 }).default("0.0000000000"),
  status: int("status").notNull().default(1),
}, (table) => ({
  userIdIdx: index("user_balance_user_id_idx").on(table.userId),
  balanceIdIdx: index("user_balance_balance_id_idx").on(table.balanceId),
  userBalanceIdx: uniqueIndex("user_balance_unique_idx").on(table.userId, table.balanceId),
}));

export const insertBalanceSchema = createInsertSchema(balances, {
  title: z.string().max(255).optional(),
  paysystem: z.string().max(255).optional(),
  currency: z.string().max(20).optional(),
  rate: z.string().optional(),
  type: z.number().int().default(1),
  status: z.number().int().default(0),
}).omit({ id: true });

export const insertUserBalanceSchema = createInsertSchema(usersBalances, {
  sum: z.string().optional(),
  statSum: z.string().optional(),
  status: z.number().int().default(1),
}).omit({ id: true });

export type InsertBalance = z.infer<typeof insertBalanceSchema>;
export type Balance = typeof balances.$inferSelect;

export type InsertUserBalance = z.infer<typeof insertUserBalanceSchema>;
export type UserBalance = typeof usersBalances.$inferSelect;

// ==================== CRYPTO WALLETS MODULE ====================

export const cryptoNetworks = mysqlTable("crypto_networks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  nodeId: int("node_id").notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  gradient: varchar("gradient", { length: 100 }),
  iconUrl: text("icon_url"),
  explorerUrl: text("explorer_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  codeIdx: uniqueIndex("network_code_idx").on(table.code),
  nodeIdIdx: index("network_node_id_idx").on(table.nodeId),
}));

export const cryptoCoins = mysqlTable("crypto_coins", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  networkId: varchar("network_id", { length: 36 }).notNull().references(() => cryptoNetworks.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  decimals: int("decimals").default(18),
  contractAddress: varchar("contract_address", { length: 100 }),
  isNative: boolean("is_native").default(false),
  iconUrl: text("icon_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  networkIdIdx: index("coin_network_id_idx").on(table.networkId),
  symbolIdx: index("coin_symbol_idx").on(table.symbol),
}));

export const cryptoWallets = mysqlTable("crypto_wallets", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  networkId: varchar("network_id", { length: 36 }).notNull().references(() => cryptoNetworks.id, { onDelete: "cascade" }),
  address: varchar("address", { length: 150 }).notNull(),
  label: varchar("label", { length: 100 }),
  encryptedPrivateKey: text("encrypted_private_key"),
  managedByApi: boolean("managed_by_api").default(true),
  externalWalletId: int("external_wallet_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("wallet_user_id_idx").on(table.userId),
  networkIdIdx: index("wallet_network_id_idx").on(table.networkId),
  addressIdx: index("wallet_address_idx").on(table.address),
  userNetworkIdx: index("wallet_user_network_idx").on(table.userId, table.networkId),
}));

export const userNetworks = mysqlTable("user_networks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  networkId: varchar("network_id", { length: 36 }).notNull().references(() => cryptoNetworks.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_network_user_id_idx").on(table.userId),
  networkIdIdx: index("user_network_network_id_idx").on(table.networkId),
  userNetworkUniqueIdx: uniqueIndex("user_network_unique_idx").on(table.userId, table.networkId),
}));

export const userFeatures = mysqlTable("user_features", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  featureKey: mysqlEnum("feature_key", ["crypto_wallets", "advanced_notes", "premium_themes"]).notNull(),
  enabled: boolean("enabled").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("user_feature_user_id_idx").on(table.userId),
  featureKeyIdx: index("user_feature_key_idx").on(table.featureKey),
  userFeatureUniqueIdx: uniqueIndex("user_feature_unique_idx").on(table.userId, table.featureKey),
}));

export const userWalletApiTokens = mysqlTable("user_wallet_api_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  externalUserHash: varchar("external_user_hash", { length: 100 }).notNull(),
  encryptedApiToken: text("encrypted_api_token").notNull(),
  refreshedAt: timestamp("refreshed_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => ({
  userIdIdx: uniqueIndex("wallet_api_token_user_id_idx").on(table.userId),
}));

// Crypto Wallets Insert Schemas
export const insertCryptoNetworkSchema = createInsertSchema(cryptoNetworks, {
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  nodeId: z.number().int().positive(),
  color: z.string().max(7).optional(),
  gradient: z.string().max(100).optional(),
  iconUrl: z.string().optional(),
  explorerUrl: z.string().optional(),
  isActive: z.boolean().optional(),
}).omit({ id: true, createdAt: true });

export const insertCryptoCoinSchema = createInsertSchema(cryptoCoins, {
  networkId: z.string().uuid(),
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  decimals: z.number().int().optional(),
  contractAddress: z.string().max(100).optional(),
  isNative: z.boolean().optional(),
  iconUrl: z.string().optional(),
}).omit({ id: true, createdAt: true });

export const insertCryptoWalletSchema = createInsertSchema(cryptoWallets, {
  networkId: z.string().uuid(),
  address: z.string().min(1).max(150),
  label: z.string().max(100).optional(),
  managedByApi: z.boolean().optional(),
  externalWalletId: z.number().int().optional(),
}).omit({ id: true, createdAt: true, encryptedPrivateKey: true });

export const insertUserNetworkSchema = createInsertSchema(userNetworks, {
  networkId: z.string().uuid(),
}).omit({ id: true, addedAt: true });

export const insertUserFeatureSchema = createInsertSchema(userFeatures, {
  featureKey: z.enum(["crypto_wallets", "advanced_notes", "premium_themes"]),
  enabled: z.boolean().optional(),
  expiresAt: z.date().optional(),
}).omit({ id: true, createdAt: true });

export const insertUserWalletApiTokenSchema = createInsertSchema(userWalletApiTokens, {
  externalUserHash: z.string().min(20).max(100),
  encryptedApiToken: z.string(),
  expiresAt: z.date().optional(),
}).omit({ id: true, refreshedAt: true });

// Crypto Wallets Types
export type InsertCryptoNetwork = z.infer<typeof insertCryptoNetworkSchema>;
export type CryptoNetwork = typeof cryptoNetworks.$inferSelect;

export type InsertCryptoCoin = z.infer<typeof insertCryptoCoinSchema>;
export type CryptoCoin = typeof cryptoCoins.$inferSelect;

export type InsertCryptoWallet = z.infer<typeof insertCryptoWalletSchema>;
export type CryptoWallet = typeof cryptoWallets.$inferSelect;

export type InsertUserNetwork = z.infer<typeof insertUserNetworkSchema>;
export type UserNetwork = typeof userNetworks.$inferSelect;

export type InsertUserFeature = z.infer<typeof insertUserFeatureSchema>;
export type UserFeature = typeof userFeatures.$inferSelect;

export type InsertUserWalletApiToken = z.infer<typeof insertUserWalletApiTokenSchema>;
export type UserWalletApiToken = typeof userWalletApiTokens.$inferSelect;

// ==================== Widget System ====================

// Grid Presets - predefined layout configurations
export const gridPresets = mysqlTable("grid_presets", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  columns: int("columns").notNull().default(12),
  slots: json("slots").notNull(), // Array of slot definitions
  breakpoints: json("breakpoints"), // Responsive configurations
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  order: int("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Widget Catalog - available widgets
export const widgetsCatalog = mysqlTable("widgets_catalog", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 50 }).notNull().unique(), // e.g., "transactions", "balance", "news"
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  minWidth: int("min_width").default(1),
  minHeight: int("min_height").default(1),
  maxWidth: int("max_width"),
  maxHeight: int("max_height"),
  supportedSizes: json("supported_sizes"), // Array of {w,h} objects
  endpoint: varchar("endpoint", { length: 255 }), // API endpoint for data
  componentKey: varchar("component_key", { length: 100 }).notNull(), // Frontend component name
  defaultConfig: json("default_config"), // Default widget settings
  isActive: boolean("is_active").default(true),
  order: int("order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Widget Layouts - saved user configurations
export const userWidgetLayouts = mysqlTable("user_widget_layouts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  presetId: varchar("preset_id", { length: 36 }).notNull().references(() => gridPresets.id),
  slotsMapping: json("slots_mapping").notNull(), // Array of {slotId, widgetId, widgetConfig}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index("layout_user_id_idx").on(table.userId),
}));

// Insert schemas
export const insertGridPresetSchema = createInsertSchema(gridPresets, {
  name: z.string().min(1).max(100),
  columns: z.number().int().min(1).max(24).optional(),
  slots: z.array(z.object({
    slotId: z.string(),
    x: z.number().int(),
    y: z.number().int(),
    w: z.number().int(),
    h: z.number().int(),
    minW: z.number().int().optional(),
    minH: z.number().int().optional(),
    maxW: z.number().int().optional(),
    maxH: z.number().int().optional(),
    allowedWidgets: z.array(z.string()).optional(),
  })),
}).omit({ id: true, createdAt: true });

export const insertWidgetCatalogSchema = createInsertSchema(widgetsCatalog, {
  key: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  componentKey: z.string().min(1).max(100),
}).omit({ id: true, createdAt: true });

export const insertUserWidgetLayoutSchema = createInsertSchema(userWidgetLayouts, {
  presetId: z.string().uuid(),
  slotsMapping: z.array(z.object({
    slotId: z.string(),
    widgetId: z.string().nullable(),
    widgetConfig: z.record(z.any()).optional(),
  })),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type GridPreset = typeof gridPresets.$inferSelect;
export type InsertGridPreset = z.infer<typeof insertGridPresetSchema>;

export type WidgetCatalogItem = typeof widgetsCatalog.$inferSelect;
export type InsertWidgetCatalogItem = z.infer<typeof insertWidgetCatalogSchema>;

export type UserWidgetLayout = typeof userWidgetLayouts.$inferSelect;
export type InsertUserWidgetLayout = z.infer<typeof insertUserWidgetLayoutSchema>;

// Slot definition type
export interface GridSlot {
  slotId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  allowedWidgets?: string[];
}

// Slot mapping type
export interface SlotMapping {
  slotId: string;
  widgetId: string | null;
  widgetConfig?: Record<string, any>;
}

