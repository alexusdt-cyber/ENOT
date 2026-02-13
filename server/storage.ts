import { eq, and, or, desc, asc, like, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  categories,
  notes,
  noteShares,
  attachments,
  taskCategories,
  tasks,
  subtasks,
  goals,
  folders,
  files,
  roadmapCategories,
  roadmaps,
  milestones,
  downloadTokens,
  linkCategories,
  links,
  notificationCategories,
  notificationTypes,
  notifications,
  appCategories,
  apps,
  userApps,
  appReviews,
  miniAppSessions,
  ssoTickets,
  cryptoNetworks,
  cryptoCoins,
  cryptoWallets,
  userNetworks,
  userFeatures,
  userWalletApiTokens,
  type User,
  type InsertUser,
  type Category,
  type InsertCategory,
  type Note,
  type InsertNote,
  type UpdateNote,
  type NoteShare,
  type InsertNoteShare,
  type Attachment,
  type InsertAttachment,
  type TaskCategory,
  type InsertTaskCategory,
  type Task,
  type InsertTask,
  type UpdateTask,
  type Subtask,
  type InsertSubtask,
  type Goal,
  type InsertGoal,
  type UpdateGoal,
  type Folder,
  type InsertFolder,
  type UpdateFolder,
  type DbFile,
  type InsertFile,
  type UpdateFile,
  type RoadmapCategory,
  type InsertRoadmapCategory,
  type Roadmap,
  type InsertRoadmap,
  type UpdateRoadmap,
  type Milestone,
  type InsertMilestone,
  type UpdateMilestone,
  type DownloadToken,
  type InsertDownloadToken,
  type LinkCategory,
  type InsertLinkCategory,
  type Link,
  type InsertLink,
  type UpdateLink,
  type NotificationCategory,
  type NotificationType,
  type Notification,
  type InsertNotification,
  type AppCategory,
  type InsertAppCategory,
  type App,
  type InsertApp,
  type UserApp,
  type InsertUserApp,
  type AppReview,
  type InsertAppReview,
  type MiniAppSession,
  type SsoTicket,
  type CryptoNetwork,
  type InsertCryptoNetwork,
  type CryptoCoin,
  type InsertCryptoCoin,
  type CryptoWallet,
  type InsertCryptoWallet,
  type UserNetwork,
  type InsertUserNetwork,
  type UserFeature,
  type InsertUserFeature,
  type UserWalletApiToken,
  type InsertUserWalletApiToken,
  memoryMapMarkers,
  memoryMapMedia,
  memoryMapAccess,
  type MemoryMapMarker,
  type InsertMemoryMapMarker,
  type MemoryMapMedia,
  type InsertMemoryMapMedia,
  type MemoryMapAccess,
  type InsertMemoryMapAccess,
  balances,
  usersBalances,
  type Balance,
  type UserBalance,
  gridPresets,
  widgetsCatalog,
  userWidgetLayouts,
  type GridPreset,
  type WidgetCatalogItem,
  type UserWidgetLayout,
  type SlotMapping,
} from "@shared/schema";
import crypto, { randomBytes } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  getCategories(userId: string): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;

  getNotes(userId: string, filters?: { categoryId?: string; search?: string; isPinned?: boolean }): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  getNoteByShareToken(shareToken: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, updates: UpdateNote): Promise<Note | undefined>;
  deleteNote(id: string): Promise<void>;
  generateShareToken(noteId: string): Promise<string>;
  updateLastAccessed(noteId: string): Promise<void>;

  getNoteShares(noteId: string): Promise<NoteShare[]>;
  getNoteShareByLink(shareLink: string): Promise<NoteShare | undefined>;
  createNoteShare(share: InsertNoteShare): Promise<NoteShare>;
  deleteNoteShare(id: string): Promise<void>;
  checkNoteAccess(noteId: string, userId: string): Promise<boolean>;

  getAttachments(noteId: string): Promise<Attachment[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;

  getTaskCategories(userId: string): Promise<TaskCategory[]>;
  getTaskCategory(id: string): Promise<TaskCategory | undefined>;
  createTaskCategory(category: InsertTaskCategory): Promise<TaskCategory>;
  updateTaskCategory(id: string, updates: Partial<InsertTaskCategory>): Promise<TaskCategory | undefined>;
  deleteTaskCategory(id: string): Promise<void>;

  getTasks(userId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  reorderTasks(taskIds: string[]): Promise<void>;

  getSubtasks(taskId: string): Promise<Subtask[]>;
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  updateSubtask(id: string, updates: Partial<InsertSubtask>): Promise<Subtask | undefined>;
  deleteSubtask(id: string): Promise<void>;

  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, updates: UpdateGoal): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<void>;
  reorderGoals(goalIds: string[]): Promise<void>;

  getFolders(userId: string): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  updateFolder(id: string, updates: UpdateFolder): Promise<Folder | undefined>;
  deleteFolder(id: string): Promise<void>;

  getFiles(userId: string, folderId?: string): Promise<DbFile[]>;
  getFile(id: string): Promise<DbFile | undefined>;
  getFileByPath(userId: string, filePath: string): Promise<DbFile | undefined>;
  createFile(file: InsertFile): Promise<DbFile>;
  updateFile(id: string, updates: UpdateFile): Promise<DbFile | undefined>;
  deleteFile(id: string): Promise<void>;

  getRoadmapCategories(userId: string): Promise<RoadmapCategory[]>;
  getRoadmapCategory(id: string): Promise<RoadmapCategory | undefined>;
  createRoadmapCategory(category: InsertRoadmapCategory): Promise<RoadmapCategory>;
  updateRoadmapCategory(id: string, updates: Partial<InsertRoadmapCategory>): Promise<RoadmapCategory | undefined>;
  deleteRoadmapCategory(id: string): Promise<void>;

  getRoadmaps(userId: string): Promise<Roadmap[]>;
  getRoadmap(id: string): Promise<Roadmap | undefined>;
  createRoadmap(roadmap: InsertRoadmap): Promise<Roadmap>;
  updateRoadmap(id: string, updates: UpdateRoadmap): Promise<Roadmap | undefined>;
  deleteRoadmap(id: string): Promise<void>;

  getMilestones(roadmapId: string): Promise<Milestone[]>;
  getMilestone(id: string): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: string, updates: UpdateMilestone): Promise<Milestone | undefined>;
  deleteMilestone(id: string): Promise<void>;

  getDownloadToken(token: string): Promise<DownloadToken | undefined>;
  getDownloadTokenByPath(userId: string, filePath: string): Promise<DownloadToken | undefined>;
  createDownloadToken(token: InsertDownloadToken): Promise<DownloadToken>;
  incrementDownloadCount(token: string): Promise<void>;

  // Link Center
  getLinkCategories(userId: string): Promise<LinkCategory[]>;
  getLinkCategory(id: string): Promise<LinkCategory | undefined>;
  createLinkCategory(category: InsertLinkCategory): Promise<LinkCategory>;
  updateLinkCategory(id: string, updates: Partial<InsertLinkCategory>): Promise<LinkCategory | undefined>;
  deleteLinkCategory(id: string): Promise<void>;

  getLinks(userId: string, categoryId?: string): Promise<Link[]>;
  getLink(id: string): Promise<Link | undefined>;
  createLink(link: InsertLink): Promise<Link>;
  updateLink(id: string, updates: UpdateLink): Promise<Link | undefined>;
  deleteLink(id: string): Promise<void>;

  // Notifications
  getNotificationCategories(): Promise<NotificationCategory[]>;
  getNotificationCategoryByKey(key: string): Promise<NotificationCategory | undefined>;
  getNotificationTypes(categoryId?: string): Promise<NotificationType[]>;
  getNotificationTypeByKey(categoryKey: string, typeKey: string): Promise<NotificationType | undefined>;
  
  getNotifications(userId: string, filters?: { categoryKey?: string; status?: string; limit?: number }): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string, categoryKey?: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<{ total: number; byCategory: Record<string, number> }>;

  // App Store
  getAppCategories(): Promise<AppCategory[]>;
  getAppCategory(id: string): Promise<AppCategory | undefined>;
  createAppCategory(category: InsertAppCategory): Promise<AppCategory>;

  getApps(categoryId?: string): Promise<App[]>;
  getApp(id: string): Promise<App | undefined>;
  getFeaturedApps(): Promise<App[]>;
  createApp(app: InsertApp): Promise<App>;
  updateApp(id: string, updates: Partial<InsertApp>): Promise<App | undefined>;
  deleteApp(id: string): Promise<void>;

  getUserApps(userId: string): Promise<(UserApp & { app: App })[]>;
  getUserApp(userId: string, appId: string): Promise<UserApp | undefined>;
  addUserApp(userApp: InsertUserApp): Promise<UserApp>;
  removeUserApp(userId: string, appId: string): Promise<void>;
  updateUserAppLaunch(userId: string, appId: string): Promise<void>;
  toggleUserAppFavorite(userId: string, appId: string): Promise<UserApp | undefined>;

  getUserAppReview(userId: string, appId: string): Promise<AppReview | undefined>;
  getAppReviews(appId: string): Promise<(AppReview & { user: Pick<User, 'id' | 'displayName' | 'avatarUrl'> })[]>;
  createAppReview(review: InsertAppReview): Promise<AppReview>;
  deleteAppReview(id: string): Promise<void>;

  // Mini App SSO
  createMiniAppSession(userId: string, appId: string, sessionNonce: string, appOrigin: string, expiresAt: Date): Promise<MiniAppSession>;
  getMiniAppSession(sessionNonce: string): Promise<MiniAppSession | undefined>;
  deleteMiniAppSession(id: string): Promise<void>;
  cleanupExpiredMiniAppSessions(): Promise<void>;

  createSsoTicket(jti: string, userId: string, appId: string, expiresAt: Date): Promise<SsoTicket>;
  getSsoTicket(jti: string): Promise<SsoTicket | undefined>;
  markSsoTicketUsed(jti: string): Promise<boolean>;
  cleanupExpiredSsoTickets(): Promise<void>;

  // Crypto Wallets
  getCryptoNetworks(): Promise<CryptoNetwork[]>;
  getCryptoNetwork(id: string): Promise<CryptoNetwork | undefined>;
  getCryptoNetworkByCode(code: string): Promise<CryptoNetwork | undefined>;
  getCryptoNetworkByNodeId(nodeId: number): Promise<CryptoNetwork | undefined>;
  
  getCryptoCoins(networkId?: string): Promise<CryptoCoin[]>;
  getCryptoCoin(id: string): Promise<CryptoCoin | undefined>;
  getCryptoCoinsByNetwork(networkId: string): Promise<CryptoCoin[]>;
  
  getCryptoWallets(userId: string, networkId?: string): Promise<(CryptoWallet & { network: CryptoNetwork })[]>;
  getCryptoWallet(id: string): Promise<CryptoWallet | undefined>;
  getCryptoWalletByAddress(userId: string, address: string): Promise<CryptoWallet | undefined>;
  createCryptoWallet(wallet: InsertCryptoWallet & { userId: string; encryptedPrivateKey?: string }): Promise<CryptoWallet>;
  updateCryptoWallet(id: string, updates: Partial<InsertCryptoWallet>): Promise<CryptoWallet | undefined>;
  deleteCryptoWallet(id: string): Promise<void>;
  
  getUserNetworks(userId: string): Promise<(UserNetwork & { network: CryptoNetwork })[]>;
  addUserNetwork(userNetwork: InsertUserNetwork & { userId: string }): Promise<UserNetwork>;
  removeUserNetwork(userId: string, networkId: string): Promise<void>;
  
  getUserFeature(userId: string, featureKey: string): Promise<UserFeature | undefined>;
  getUserFeatures(userId: string): Promise<UserFeature[]>;
  setUserFeature(feature: InsertUserFeature & { userId: string }): Promise<UserFeature>;
  
  getUserWalletApiToken(userId: string): Promise<UserWalletApiToken | undefined>;
  saveUserWalletApiToken(token: InsertUserWalletApiToken & { userId: string }): Promise<UserWalletApiToken>;
  updateUserWalletApiToken(userId: string, updates: Partial<InsertUserWalletApiToken>): Promise<UserWalletApiToken | undefined>;

  // My Memory Map
  getMemoryMapMarkersByOwner(ownerId: string): Promise<MemoryMapMarker[]>;
  getSharedMemoryMapMarkers(userId: string): Promise<MemoryMapMarker[]>;
  getMemoryMapMarkerById(id: string): Promise<MemoryMapMarker | null>;
  createMemoryMapMarker(ownerId: string, data: InsertMemoryMapMarker): Promise<MemoryMapMarker>;
  updateMemoryMapMarker(id: string, data: Partial<InsertMemoryMapMarker>): Promise<MemoryMapMarker | null>;
  deleteMemoryMapMarker(id: string): Promise<boolean>;
  
  getMemoryMapMediaByMarker(markerId: string): Promise<MemoryMapMedia[]>;
  getMemoryMapMediaById(id: string): Promise<MemoryMapMedia | null>;
  createMemoryMapMedia(markerId: string, data: Omit<InsertMemoryMapMedia, 'markerId'>): Promise<MemoryMapMedia>;
  deleteMemoryMapMedia(id: string): Promise<boolean>;
  reorderMemoryMapMedia(markerId: string, mediaIds: string[]): Promise<boolean>;
  
  getMemoryMapAccessByMarker(markerId: string): Promise<MemoryMapAccess[]>;
  getMemoryMapAccessByMarkerAndUser(markerId: string, userId: string): Promise<MemoryMapAccess | null>;
  createMemoryMapAccess(markerId: string, userId: string, role: 'viewer' | 'editor'): Promise<MemoryMapAccess>;
  updateMemoryMapAccess(markerId: string, userId: string, role: 'viewer' | 'editor'): Promise<MemoryMapAccess | null>;
  deleteMemoryMapAccess(markerId: string, userId: string): Promise<boolean>;
  
  getUserByUsername(username: string): Promise<{ id: string; username: string | null } | null>;
  
  getBalances(): Promise<Balance[]>;
  getBalance(id: number): Promise<Balance | undefined>;
  getUserBalances(userId: string): Promise<(UserBalance & { balance: Balance })[]>;
  createUserBalance(userId: string, balanceId: number): Promise<UserBalance>;
  ensureUserBalances(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0];
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userId = crypto.randomUUID();
    await db.insert(users).values({ ...insertUser, id: userId });
    const newUser = await this.getUser(userId);
    if (!newUser) throw new Error("Failed to create user");
    
    // Create empty balances for all active balance types
    await this.ensureUserBalances(userId);
    
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    await db.update(users).set(updates).where(eq(users.id, id));
    return this.getUser(id);
  }

  async getCategories(userId: string): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.userId, userId)).orderBy(categories.order);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const categoryId = crypto.randomUUID();
    await db.insert(categories).values({ ...category, id: categoryId });
    const newCategory = await this.getCategory(categoryId);
    if (!newCategory) throw new Error("Failed to create category");
    return newCategory;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    await db.update(categories).set(updates).where(eq(categories.id, id));
    return this.getCategory(id);
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getNotes(
    userId: string,
    filters?: { categoryId?: string; search?: string; isPinned?: boolean }
  ): Promise<Note[]> {
    const conditions = [eq(notes.userId, userId)];

    if (filters?.categoryId) {
      conditions.push(eq(notes.categoryId, filters.categoryId));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(notes.title, `%${filters.search}%`),
          like(notes.content, `%${filters.search}%`)
        )!
      );
    }

    if (filters?.isPinned !== undefined) {
      conditions.push(eq(notes.isPinned, filters.isPinned));
    }

    return db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.updatedAt));
  }

  async getNote(id: string): Promise<Note | undefined> {
    const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return result[0];
  }

  async getNoteByShareToken(shareToken: string): Promise<Note | undefined> {
    const result = await db.select().from(notes).where(eq(notes.shareToken, shareToken)).limit(1);
    return result[0];
  }

  async createNote(note: InsertNote): Promise<Note> {
    const noteId = crypto.randomUUID();
    await db.insert(notes).values({ ...note, id: noteId });
    const newNote = await this.getNote(noteId);
    if (!newNote) throw new Error("Failed to create note");
    return newNote;
  }

  async updateNote(id: string, updates: UpdateNote): Promise<Note | undefined> {
    await db.update(notes).set(updates).where(eq(notes.id, id));
    return this.getNote(id);
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async generateShareToken(noteId: string): Promise<string> {
    const shareToken = randomBytes(32).toString("hex");
    await db.update(notes).set({ shareToken, isPublic: true }).where(eq(notes.id, noteId));
    return shareToken;
  }

  async updateLastAccessed(noteId: string): Promise<void> {
    await db.update(notes).set({ lastAccessedAt: new Date() }).where(eq(notes.id, noteId));
  }

  async getNoteShares(noteId: string): Promise<NoteShare[]> {
    return db.select().from(noteShares).where(eq(noteShares.noteId, noteId));
  }

  async getNoteShareByLink(shareLink: string): Promise<NoteShare | undefined> {
    const result = await db.select().from(noteShares).where(eq(noteShares.shareLink, shareLink)).limit(1);
    return result[0];
  }

  async createNoteShare(share: InsertNoteShare): Promise<NoteShare> {
    const shareId = crypto.randomUUID();
    const shareLink = randomBytes(16).toString("hex");
    await db.insert(noteShares).values({ ...share, id: shareId, shareLink });
    const shares = await this.getNoteShares(share.noteId);
    const newShare = shares.find(s => s.id === shareId);
    if (!newShare) throw new Error("Failed to create share");
    return newShare;
  }

  async deleteNoteShare(id: string): Promise<void> {
    await db.delete(noteShares).where(eq(noteShares.id, id));
  }

  async checkNoteAccess(noteId: string, userId: string): Promise<boolean> {
    const note = await this.getNote(noteId);
    if (!note) return false;
    if (note.userId === userId) return true;

    const shares = await db
      .select()
      .from(noteShares)
      .where(
        and(
          eq(noteShares.noteId, noteId),
          eq(noteShares.sharedWithUserId, userId)
        )
      );

    return shares.length > 0;
  }

  async getAttachments(noteId: string): Promise<Attachment[]> {
    return db.select().from(attachments).where(eq(attachments.noteId, noteId));
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const attachmentId = crypto.randomUUID();
    await db.insert(attachments).values({ ...attachment, id: attachmentId });
    const allAttachments = await this.getAttachments(attachment.noteId);
    const newAttachment = allAttachments.find(a => a.id === attachmentId);
    if (!newAttachment) throw new Error("Failed to create attachment");
    return newAttachment;
  }

  async deleteAttachment(id: string): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  async getTaskCategories(userId: string): Promise<TaskCategory[]> {
    return db.select().from(taskCategories).where(eq(taskCategories.userId, userId));
  }

  async getTaskCategory(id: string): Promise<TaskCategory | undefined> {
    const result = await db.select().from(taskCategories).where(eq(taskCategories.id, id)).limit(1);
    return result[0];
  }

  async createTaskCategory(category: InsertTaskCategory): Promise<TaskCategory> {
    const categoryId = crypto.randomUUID();
    await db.insert(taskCategories).values({ ...category, id: categoryId });
    const newCategory = await this.getTaskCategory(categoryId);
    if (!newCategory) throw new Error("Failed to create task category");
    return newCategory;
  }

  async updateTaskCategory(id: string, updates: Partial<InsertTaskCategory>): Promise<TaskCategory | undefined> {
    await db.update(taskCategories).set(updates).where(eq(taskCategories.id, id));
    return this.getTaskCategory(id);
  }

  async deleteTaskCategory(id: string): Promise<void> {
    await db.delete(taskCategories).where(eq(taskCategories.id, id));
  }

  async getTasks(userId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(sql`COALESCE(${tasks.order}, 999999) ASC`, desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const taskId = crypto.randomUUID();
    
    // Calculate order server-side to ensure correct ordering even with stale client data
    let taskOrder = task.order;
    if (taskOrder === undefined || taskOrder === null) {
      const maxOrderResult = await db.select({ maxOrder: sql<number>`COALESCE(MAX(${tasks.order}), -1)` })
        .from(tasks)
        .where(eq(tasks.userId, task.userId));
      taskOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
    }
    
    await db.insert(tasks).values({ ...task, id: taskId, order: taskOrder });
    const newTask = await this.getTask(taskId);
    if (!newTask) throw new Error("Failed to create task");
    return newTask;
  }

  async updateTask(id: string, updates: UpdateTask): Promise<Task | undefined> {
    await db.update(tasks).set(updates).where(eq(tasks.id, id));
    return this.getTask(id);
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async reorderTasks(taskIds: string[]): Promise<void> {
    for (let i = 0; i < taskIds.length; i++) {
      await db.update(tasks).set({ order: i }).where(eq(tasks.id, taskIds[i]));
    }
  }

  async getSubtasks(taskId: string): Promise<Subtask[]> {
    return db.select().from(subtasks).where(eq(subtasks.taskId, taskId));
  }

  async createSubtask(subtask: InsertSubtask): Promise<Subtask> {
    const subtaskId = crypto.randomUUID();
    await db.insert(subtasks).values({ ...subtask, id: subtaskId });
    const allSubtasks = await this.getSubtasks(subtask.taskId);
    const newSubtask = allSubtasks.find(s => s.id === subtaskId);
    if (!newSubtask) throw new Error("Failed to create subtask");
    return newSubtask;
  }

  async updateSubtask(id: string, updates: Partial<InsertSubtask>): Promise<Subtask | undefined> {
    await db.update(subtasks).set(updates).where(eq(subtasks.id, id));
    const result = await db.select().from(subtasks).where(eq(subtasks.id, id)).limit(1);
    return result[0];
  }

  async deleteSubtask(id: string): Promise<void> {
    await db.delete(subtasks).where(eq(subtasks.id, id));
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(sql`COALESCE(${goals.order}, 999999) ASC`, desc(goals.createdAt));
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const result = await db.select().from(goals).where(eq(goals.id, id)).limit(1);
    return result[0];
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const goalId = crypto.randomUUID();
    
    let goalOrder = goal.order;
    if (goalOrder === undefined || goalOrder === null) {
      const maxOrderResult = await db.select({ maxOrder: sql<number>`COALESCE(MAX(${goals.order}), -1)` })
        .from(goals)
        .where(eq(goals.userId, goal.userId));
      goalOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
    }
    
    await db.insert(goals).values({ ...goal, id: goalId, order: goalOrder });
    const newGoal = await this.getGoal(goalId);
    if (!newGoal) throw new Error("Failed to create goal");
    return newGoal;
  }

  async updateGoal(id: string, updates: UpdateGoal): Promise<Goal | undefined> {
    await db.update(goals).set(updates).where(eq(goals.id, id));
    return this.getGoal(id);
  }

  async deleteGoal(id: string): Promise<void> {
    await db.delete(goals).where(eq(goals.id, id));
  }

  async reorderGoals(goalIds: string[]): Promise<void> {
    for (let i = 0; i < goalIds.length; i++) {
      await db.update(goals).set({ order: i }).where(eq(goals.id, goalIds[i]));
    }
  }

  async getFolders(userId: string): Promise<Folder[]> {
    return db.select().from(folders).where(eq(folders.userId, userId)).orderBy(folders.name);
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const result = await db.select().from(folders).where(eq(folders.id, id)).limit(1);
    return result[0];
  }

  async createFolder(folder: InsertFolder): Promise<Folder> {
    const folderId = crypto.randomUUID();
    await db.insert(folders).values({ ...folder, id: folderId });
    const newFolder = await this.getFolder(folderId);
    if (!newFolder) throw new Error("Failed to create folder");
    return newFolder;
  }

  async updateFolder(id: string, updates: UpdateFolder): Promise<Folder | undefined> {
    await db.update(folders).set(updates).where(eq(folders.id, id));
    return this.getFolder(id);
  }

  async deleteFolder(id: string): Promise<void> {
    await db.delete(files).where(eq(files.folderId, id));
    await db.delete(folders).where(eq(folders.id, id));
  }

  async getFiles(userId: string, folderId?: string): Promise<DbFile[]> {
    if (folderId) {
      return db.select().from(files).where(and(eq(files.userId, userId), eq(files.folderId, folderId))).orderBy(desc(files.createdAt));
    }
    return db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.createdAt));
  }

  async getFile(id: string): Promise<DbFile | undefined> {
    const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
    return result[0];
  }

  async getFileByPath(userId: string, filePath: string): Promise<DbFile | undefined> {
    const result = await db.select().from(files)
      .where(and(eq(files.userId, userId), eq(files.path, filePath)))
      .limit(1);
    return result[0];
  }

  async createFile(file: InsertFile): Promise<DbFile> {
    const fileId = crypto.randomUUID();
    await db.insert(files).values({ ...file, id: fileId });
    const newFile = await this.getFile(fileId);
    if (!newFile) throw new Error("Failed to create file");
    return newFile;
  }

  async updateFile(id: string, updates: UpdateFile): Promise<DbFile | undefined> {
    await db.update(files).set(updates).where(eq(files.id, id));
    return this.getFile(id);
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async getRoadmapCategories(userId: string): Promise<RoadmapCategory[]> {
    return db.select().from(roadmapCategories).where(eq(roadmapCategories.userId, userId)).orderBy(roadmapCategories.createdAt);
  }

  async getRoadmapCategory(id: string): Promise<RoadmapCategory | undefined> {
    const result = await db.select().from(roadmapCategories).where(eq(roadmapCategories.id, id)).limit(1);
    return result[0];
  }

  async createRoadmapCategory(category: InsertRoadmapCategory): Promise<RoadmapCategory> {
    const categoryId = crypto.randomUUID();
    await db.insert(roadmapCategories).values({ ...category, id: categoryId });
    const newCategory = await this.getRoadmapCategory(categoryId);
    if (!newCategory) throw new Error("Failed to create roadmap category");
    return newCategory;
  }

  async updateRoadmapCategory(id: string, updates: Partial<InsertRoadmapCategory>): Promise<RoadmapCategory | undefined> {
    await db.update(roadmapCategories).set(updates).where(eq(roadmapCategories.id, id));
    return this.getRoadmapCategory(id);
  }

  async deleteRoadmapCategory(id: string): Promise<void> {
    await db.delete(roadmapCategories).where(eq(roadmapCategories.id, id));
  }

  async getRoadmaps(userId: string): Promise<Roadmap[]> {
    return db.select().from(roadmaps).where(eq(roadmaps.userId, userId)).orderBy(desc(roadmaps.pinned), desc(roadmaps.createdAt));
  }

  async getRoadmap(id: string): Promise<Roadmap | undefined> {
    const result = await db.select().from(roadmaps).where(eq(roadmaps.id, id)).limit(1);
    return result[0];
  }

  async createRoadmap(roadmap: InsertRoadmap): Promise<Roadmap> {
    const roadmapId = crypto.randomUUID();
    await db.insert(roadmaps).values({ ...roadmap, id: roadmapId });
    const newRoadmap = await this.getRoadmap(roadmapId);
    if (!newRoadmap) throw new Error("Failed to create roadmap");
    return newRoadmap;
  }

  async updateRoadmap(id: string, updates: UpdateRoadmap): Promise<Roadmap | undefined> {
    await db.update(roadmaps).set(updates).where(eq(roadmaps.id, id));
    return this.getRoadmap(id);
  }

  async deleteRoadmap(id: string): Promise<void> {
    await db.delete(milestones).where(eq(milestones.roadmapId, id));
    await db.delete(roadmaps).where(eq(roadmaps.id, id));
  }

  async getMilestones(roadmapId: string): Promise<Milestone[]> {
    return db.select().from(milestones).where(eq(milestones.roadmapId, roadmapId)).orderBy(milestones.order);
  }

  async getMilestone(id: string): Promise<Milestone | undefined> {
    const result = await db.select().from(milestones).where(eq(milestones.id, id)).limit(1);
    return result[0];
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const milestoneId = crypto.randomUUID();
    const existingMilestones = await this.getMilestones(milestone.roadmapId);
    const order = existingMilestones.length;
    await db.insert(milestones).values({ ...milestone, id: milestoneId, order });
    const newMilestone = await this.getMilestone(milestoneId);
    if (!newMilestone) throw new Error("Failed to create milestone");
    return newMilestone;
  }

  async updateMilestone(id: string, updates: UpdateMilestone): Promise<Milestone | undefined> {
    await db.update(milestones).set(updates).where(eq(milestones.id, id));
    return this.getMilestone(id);
  }

  async deleteMilestone(id: string): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  async getDownloadToken(token: string): Promise<DownloadToken | undefined> {
    const result = await db.select().from(downloadTokens).where(eq(downloadTokens.token, token)).limit(1);
    return result[0];
  }

  async getDownloadTokenByPath(userId: string, filePath: string): Promise<DownloadToken | undefined> {
    const result = await db.select().from(downloadTokens)
      .where(and(eq(downloadTokens.userId, userId), eq(downloadTokens.filePath, filePath)))
      .limit(1);
    return result[0];
  }

  async createDownloadToken(token: InsertDownloadToken): Promise<DownloadToken> {
    const tokenId = crypto.randomUUID();
    await db.insert(downloadTokens).values({ ...token, id: tokenId });
    const newToken = await db.select().from(downloadTokens).where(eq(downloadTokens.id, tokenId)).limit(1);
    if (!newToken[0]) throw new Error("Failed to create download token");
    return newToken[0];
  }

  async incrementDownloadCount(token: string): Promise<void> {
    await db.update(downloadTokens)
      .set({ downloadCount: sql`${downloadTokens.downloadCount} + 1` })
      .where(eq(downloadTokens.token, token));
  }

  // Link Center Methods
  async getLinkCategories(userId: string): Promise<LinkCategory[]> {
    return db.select().from(linkCategories).where(eq(linkCategories.userId, userId)).orderBy(linkCategories.order);
  }

  async getLinkCategory(id: string): Promise<LinkCategory | undefined> {
    const result = await db.select().from(linkCategories).where(eq(linkCategories.id, id)).limit(1);
    return result[0];
  }

  async createLinkCategory(category: InsertLinkCategory): Promise<LinkCategory> {
    const categoryId = crypto.randomUUID();
    const existingCategories = await this.getLinkCategories(category.userId);
    const order = existingCategories.length;
    await db.insert(linkCategories).values({ ...category, id: categoryId, order });
    const newCategory = await this.getLinkCategory(categoryId);
    if (!newCategory) throw new Error("Failed to create link category");
    return newCategory;
  }

  async updateLinkCategory(id: string, updates: Partial<InsertLinkCategory>): Promise<LinkCategory | undefined> {
    await db.update(linkCategories).set(updates).where(eq(linkCategories.id, id));
    return this.getLinkCategory(id);
  }

  async deleteLinkCategory(id: string): Promise<void> {
    await db.delete(links).where(eq(links.categoryId, id));
    await db.delete(linkCategories).where(eq(linkCategories.id, id));
  }

  async getLinks(userId: string, categoryId?: string): Promise<Link[]> {
    if (categoryId) {
      return db.select().from(links)
        .where(and(eq(links.userId, userId), eq(links.categoryId, categoryId)))
        .orderBy(desc(links.createdAt));
    }
    return db.select().from(links).where(eq(links.userId, userId)).orderBy(desc(links.createdAt));
  }

  async getLink(id: string): Promise<Link | undefined> {
    const result = await db.select().from(links).where(eq(links.id, id)).limit(1);
    return result[0];
  }

  async createLink(link: InsertLink): Promise<Link> {
    const linkId = crypto.randomUUID();
    await db.insert(links).values({ ...link, id: linkId });
    const newLink = await this.getLink(linkId);
    if (!newLink) throw new Error("Failed to create link");
    return newLink;
  }

  async updateLink(id: string, updates: UpdateLink): Promise<Link | undefined> {
    await db.update(links).set(updates).where(eq(links.id, id));
    return this.getLink(id);
  }

  async deleteLink(id: string): Promise<void> {
    await db.delete(links).where(eq(links.id, id));
  }

  // Notification Methods
  async getNotificationCategories(): Promise<NotificationCategory[]> {
    return db.select().from(notificationCategories).orderBy(notificationCategories.order);
  }

  async getNotificationCategoryByKey(key: string): Promise<NotificationCategory | undefined> {
    const result = await db.select().from(notificationCategories)
      .where(eq(notificationCategories.key, key)).limit(1);
    return result[0];
  }

  async getNotificationTypes(categoryId?: string): Promise<NotificationType[]> {
    if (categoryId) {
      return db.select().from(notificationTypes)
        .where(eq(notificationTypes.categoryId, categoryId));
    }
    return db.select().from(notificationTypes);
  }

  async getNotificationTypeByKey(categoryKey: string, typeKey: string): Promise<NotificationType | undefined> {
    const category = await this.getNotificationCategoryByKey(categoryKey);
    if (!category) return undefined;
    
    const result = await db.select().from(notificationTypes)
      .where(and(
        eq(notificationTypes.categoryId, category.id),
        eq(notificationTypes.key, typeKey)
      )).limit(1);
    return result[0];
  }

  async getNotifications(userId: string, filters?: { categoryKey?: string; status?: string; limit?: number }): Promise<Notification[]> {
    let query = db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    
    const results = await query;
    
    // Filter by category key if provided
    if (filters?.categoryKey) {
      const category = await this.getNotificationCategoryByKey(filters.categoryKey);
      if (category) {
        return results.filter(n => n.categoryId === category.id);
      }
      return [];
    }
    
    // Filter by status if provided
    if (filters?.status) {
      return results.filter(n => n.status === filters.status);
    }
    
    return results;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const result = await db.select().from(notifications)
      .where(eq(notifications.id, id)).limit(1);
    return result[0];
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const notificationId = crypto.randomUUID();
    await db.insert(notifications).values({ ...notification, id: notificationId });
    const newNotification = await this.getNotification(notificationId);
    if (!newNotification) throw new Error("Failed to create notification");
    return newNotification;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    await db.update(notifications).set({ 
      status: "read",
      readAt: new Date()
    }).where(eq(notifications.id, id));
    return this.getNotification(id);
  }

  async markAllNotificationsRead(userId: string, categoryKey?: string): Promise<void> {
    if (categoryKey) {
      const category = await this.getNotificationCategoryByKey(categoryKey);
      if (category) {
        await db.update(notifications).set({ 
          status: "read",
          readAt: new Date()
        }).where(and(
          eq(notifications.userId, userId),
          eq(notifications.categoryId, category.id),
          eq(notifications.status, "unread")
        ));
      }
    } else {
      await db.update(notifications).set({ 
        status: "read",
        readAt: new Date()
      }).where(and(
        eq(notifications.userId, userId),
        eq(notifications.status, "unread")
      ));
    }
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async getUnreadNotificationCount(userId: string): Promise<{ total: number; byCategory: Record<string, number> }> {
    const unreadNotifications = await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.status, "unread")
      ));
    
    const categories = await this.getNotificationCategories();
    const byCategory: Record<string, number> = {};
    
    for (const cat of categories) {
      byCategory[cat.key] = unreadNotifications.filter(n => n.categoryId === cat.id).length;
    }
    
    return {
      total: unreadNotifications.length,
      byCategory
    };
  }

  // App Store Implementation
  async getAppCategories(): Promise<AppCategory[]> {
    return db.select().from(appCategories).orderBy(appCategories.order);
  }

  async getAppCategory(id: string): Promise<AppCategory | undefined> {
    const result = await db.select().from(appCategories).where(eq(appCategories.id, id)).limit(1);
    return result[0];
  }

  async createAppCategory(category: InsertAppCategory): Promise<AppCategory> {
    const categoryId = crypto.randomUUID();
    await db.insert(appCategories).values({ ...category, id: categoryId });
    const newCategory = await this.getAppCategory(categoryId);
    if (!newCategory) throw new Error("Failed to create app category");
    return newCategory;
  }

  async getApps(categoryId?: string): Promise<App[]> {
    const allApps = categoryId 
      ? await db.select().from(apps).where(eq(apps.categoryId, categoryId)).orderBy(desc(apps.rating))
      : await db.select().from(apps).orderBy(desc(apps.rating));
    
    // Get real download counts from user_apps table
    const downloadCounts = await db.select({
      appId: userApps.appId,
      count: sql<number>`COUNT(*)`.as('count')
    }).from(userApps).groupBy(userApps.appId);
    
    const countMap = new Map(downloadCounts.map(d => [d.appId, Number(d.count)]));
    
    return allApps.map(app => ({
      ...app,
      downloads: countMap.get(app.id) || 0
    }));
  }

  async getApp(id: string): Promise<App | undefined> {
    const result = await db.select().from(apps).where(eq(apps.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    // Get real download count
    const downloadCount = await db.select({
      count: sql<number>`COUNT(*)`.as('count')
    }).from(userApps).where(eq(userApps.appId, id));
    
    return {
      ...result[0],
      downloads: Number(downloadCount[0]?.count || 0)
    };
  }

  async getFeaturedApps(): Promise<App[]> {
    return db.select().from(apps).where(eq(apps.featured, true)).orderBy(desc(apps.rating));
  }

  async createApp(app: InsertApp): Promise<App> {
    const appId = crypto.randomUUID();
    await db.insert(apps).values({ ...app, id: appId });
    const newApp = await this.getApp(appId);
    if (!newApp) throw new Error("Failed to create app");
    return newApp;
  }

  async updateApp(id: string, updates: Partial<InsertApp>): Promise<App | undefined> {
    await db.update(apps).set(updates).where(eq(apps.id, id));
    return this.getApp(id);
  }

  async deleteApp(id: string): Promise<void> {
    await db.delete(apps).where(eq(apps.id, id));
  }

  async getUserApps(userId: string): Promise<(UserApp & { app: App })[]> {
    const result = await db.select({
      id: userApps.id,
      userId: userApps.userId,
      appId: userApps.appId,
      addedAt: userApps.addedAt,
      lastLaunchedAt: userApps.lastLaunchedAt,
      isFavorite: userApps.isFavorite,
      app: apps
    }).from(userApps)
      .innerJoin(apps, eq(userApps.appId, apps.id))
      .where(eq(userApps.userId, userId))
      .orderBy(desc(userApps.addedAt));
    return result;
  }

  async getUserApp(userId: string, appId: string): Promise<UserApp | undefined> {
    const result = await db.select().from(userApps)
      .where(and(eq(userApps.userId, userId), eq(userApps.appId, appId)))
      .limit(1);
    return result[0];
  }

  async addUserApp(userApp: InsertUserApp): Promise<UserApp> {
    const userAppId = crypto.randomUUID();
    await db.insert(userApps).values({ ...userApp, id: userAppId });
    const newUserApp = await db.select().from(userApps).where(eq(userApps.id, userAppId)).limit(1);
    if (!newUserApp[0]) throw new Error("Failed to add user app");
    
    // Increment downloads count
    await db.update(apps).set({ 
      downloads: sql`${apps.downloads} + 1` 
    }).where(eq(apps.id, userApp.appId));
    
    return newUserApp[0];
  }

  async removeUserApp(userId: string, appId: string): Promise<void> {
    await db.delete(userApps).where(
      and(eq(userApps.userId, userId), eq(userApps.appId, appId))
    );
  }

  async updateUserAppLaunch(userId: string, appId: string): Promise<void> {
    await db.update(userApps).set({ 
      lastLaunchedAt: new Date() 
    }).where(and(eq(userApps.userId, userId), eq(userApps.appId, appId)));
  }

  async toggleUserAppFavorite(userId: string, appId: string): Promise<UserApp | undefined> {
    const existing = await this.getUserApp(userId, appId);
    if (!existing) return undefined;
    
    await db.update(userApps).set({ 
      isFavorite: !existing.isFavorite 
    }).where(and(eq(userApps.userId, userId), eq(userApps.appId, appId)));
    
    return this.getUserApp(userId, appId);
  }

  async getUserAppReview(userId: string, appId: string): Promise<AppReview | undefined> {
    const result = await db.select().from(appReviews)
      .where(and(eq(appReviews.userId, userId), eq(appReviews.appId, appId)))
      .limit(1);
    return result[0];
  }

  async getAppReviews(appId: string): Promise<(AppReview & { user: Pick<User, 'id' | 'displayName' | 'avatarUrl'> })[]> {
    const result = await db.select({
      id: appReviews.id,
      appId: appReviews.appId,
      userId: appReviews.userId,
      rating: appReviews.rating,
      title: appReviews.title,
      content: appReviews.content,
      createdAt: appReviews.createdAt,
      user: {
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl
      }
    }).from(appReviews)
      .innerJoin(users, eq(appReviews.userId, users.id))
      .where(eq(appReviews.appId, appId))
      .orderBy(desc(appReviews.createdAt));
    return result;
  }

  async createAppReview(review: InsertAppReview): Promise<AppReview> {
    const reviewId = crypto.randomUUID();
    await db.insert(appReviews).values({ ...review, id: reviewId });
    const newReview = await db.select().from(appReviews).where(eq(appReviews.id, reviewId)).limit(1);
    if (!newReview[0]) throw new Error("Failed to create review");
    
    // Update app average rating
    const allReviews = await db.select().from(appReviews).where(eq(appReviews.appId, review.appId));
    const avgRating = Math.round(allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length);
    await db.update(apps).set({ rating: avgRating }).where(eq(apps.id, review.appId));
    
    return newReview[0];
  }

  async deleteAppReview(id: string): Promise<void> {
    await db.delete(appReviews).where(eq(appReviews.id, id));
  }

  // ==================== MINI APP SSO ====================

  async createMiniAppSession(userId: string, appId: string, sessionNonce: string, appOrigin: string, expiresAt: Date): Promise<MiniAppSession> {
    const sessionId = crypto.randomUUID();
    await db.insert(miniAppSessions).values({
      id: sessionId,
      userId,
      appId,
      sessionNonce,
      appOrigin,
      expiresAt,
    });
    const result = await db.select().from(miniAppSessions).where(eq(miniAppSessions.id, sessionId)).limit(1);
    return result[0];
  }

  async getMiniAppSession(sessionNonce: string): Promise<MiniAppSession | undefined> {
    const result = await db.select().from(miniAppSessions)
      .where(eq(miniAppSessions.sessionNonce, sessionNonce))
      .limit(1);
    
    const session = result[0];
    if (!session) return undefined;
    
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt <= now) {
      return undefined;
    }
    
    return session;
  }

  async deleteMiniAppSession(id: string): Promise<void> {
    await db.delete(miniAppSessions).where(eq(miniAppSessions.id, id));
  }

  async cleanupExpiredMiniAppSessions(): Promise<void> {
    await db.delete(miniAppSessions).where(sql`${miniAppSessions.expiresAt} <= NOW()`);
  }

  async createSsoTicket(jti: string, userId: string, appId: string, expiresAt: Date): Promise<SsoTicket> {
    const ticketId = crypto.randomUUID();
    await db.insert(ssoTickets).values({
      id: ticketId,
      jti,
      userId,
      appId,
      expiresAt,
      used: false,
    });
    const result = await db.select().from(ssoTickets).where(eq(ssoTickets.id, ticketId)).limit(1);
    return result[0];
  }

  async getSsoTicket(jti: string): Promise<SsoTicket | undefined> {
    const result = await db.select().from(ssoTickets).where(eq(ssoTickets.jti, jti)).limit(1);
    return result[0];
  }

  async markSsoTicketUsed(jti: string): Promise<boolean> {
    const ticket = await db.select().from(ssoTickets).where(eq(ssoTickets.jti, jti)).then(r => r[0]);
    if (!ticket) return false;
    if (ticket.used) return false;
    
    const ticketExpiry = new Date(ticket.expiresAt);
    const now = new Date();
    if (ticketExpiry <= now) return false;
    
    await db.update(ssoTickets)
      .set({ used: true, usedAt: new Date() })
      .where(eq(ssoTickets.jti, jti));
    
    return true;
  }

  async cleanupExpiredSsoTickets(): Promise<void> {
    await db.delete(ssoTickets).where(sql`${ssoTickets.expiresAt} <= NOW()`);
  }

  // ==================== CRYPTO WALLETS ====================

  async getCryptoNetworks(): Promise<CryptoNetwork[]> {
    return db.select().from(cryptoNetworks).where(eq(cryptoNetworks.isActive, true)).orderBy(cryptoNetworks.nodeId);
  }

  async getCryptoNetwork(id: string): Promise<CryptoNetwork | undefined> {
    const result = await db.select().from(cryptoNetworks).where(eq(cryptoNetworks.id, id)).limit(1);
    return result[0];
  }

  async getCryptoNetworkByCode(code: string): Promise<CryptoNetwork | undefined> {
    const result = await db.select().from(cryptoNetworks).where(eq(cryptoNetworks.code, code)).limit(1);
    return result[0];
  }

  async getCryptoNetworkByNodeId(nodeId: number): Promise<CryptoNetwork | undefined> {
    const result = await db.select().from(cryptoNetworks).where(eq(cryptoNetworks.nodeId, nodeId)).limit(1);
    return result[0];
  }

  async getCryptoCoins(networkId?: string): Promise<CryptoCoin[]> {
    if (networkId) {
      return db.select().from(cryptoCoins).where(eq(cryptoCoins.networkId, networkId)).orderBy(desc(cryptoCoins.isNative), cryptoCoins.symbol);
    }
    return db.select().from(cryptoCoins).orderBy(desc(cryptoCoins.isNative), cryptoCoins.symbol);
  }

  async getCryptoCoin(id: string): Promise<CryptoCoin | undefined> {
    const result = await db.select().from(cryptoCoins).where(eq(cryptoCoins.id, id)).limit(1);
    return result[0];
  }

  async getCryptoCoinsByNetwork(networkId: string): Promise<CryptoCoin[]> {
    return db.select().from(cryptoCoins).where(eq(cryptoCoins.networkId, networkId)).orderBy(desc(cryptoCoins.isNative), cryptoCoins.symbol);
  }

  async getCryptoWallets(userId: string, networkId?: string): Promise<(CryptoWallet & { network: CryptoNetwork })[]> {
    const conditions = [eq(cryptoWallets.userId, userId)];
    if (networkId) {
      conditions.push(eq(cryptoWallets.networkId, networkId));
    }
    
    const result = await db.select({
      id: cryptoWallets.id,
      userId: cryptoWallets.userId,
      networkId: cryptoWallets.networkId,
      address: cryptoWallets.address,
      label: cryptoWallets.label,
      encryptedPrivateKey: cryptoWallets.encryptedPrivateKey,
      managedByApi: cryptoWallets.managedByApi,
      externalWalletId: cryptoWallets.externalWalletId,
      createdAt: cryptoWallets.createdAt,
      network: cryptoNetworks
    }).from(cryptoWallets)
      .innerJoin(cryptoNetworks, eq(cryptoWallets.networkId, cryptoNetworks.id))
      .where(and(...conditions))
      .orderBy(desc(cryptoWallets.createdAt));
    
    return result;
  }

  async getCryptoWallet(id: string): Promise<CryptoWallet | undefined> {
    const result = await db.select().from(cryptoWallets).where(eq(cryptoWallets.id, id)).limit(1);
    return result[0];
  }

  async getCryptoWalletByAddress(userId: string, address: string): Promise<CryptoWallet | undefined> {
    const result = await db.select().from(cryptoWallets)
      .where(and(eq(cryptoWallets.userId, userId), eq(cryptoWallets.address, address)))
      .limit(1);
    return result[0];
  }

  async createCryptoWallet(wallet: InsertCryptoWallet & { userId: string; encryptedPrivateKey?: string }): Promise<CryptoWallet> {
    const walletId = crypto.randomUUID();
    await db.insert(cryptoWallets).values({ 
      ...wallet, 
      id: walletId,
      encryptedPrivateKey: wallet.encryptedPrivateKey || null
    });
    const newWallet = await this.getCryptoWallet(walletId);
    if (!newWallet) throw new Error("Failed to create wallet");
    return newWallet;
  }

  async updateCryptoWallet(id: string, updates: Partial<InsertCryptoWallet>): Promise<CryptoWallet | undefined> {
    await db.update(cryptoWallets).set(updates).where(eq(cryptoWallets.id, id));
    return this.getCryptoWallet(id);
  }

  async deleteCryptoWallet(id: string): Promise<void> {
    await db.delete(cryptoWallets).where(eq(cryptoWallets.id, id));
  }

  async getUserNetworks(userId: string): Promise<(UserNetwork & { network: CryptoNetwork })[]> {
    const result = await db.select({
      id: userNetworks.id,
      userId: userNetworks.userId,
      networkId: userNetworks.networkId,
      addedAt: userNetworks.addedAt,
      network: cryptoNetworks
    }).from(userNetworks)
      .innerJoin(cryptoNetworks, eq(userNetworks.networkId, cryptoNetworks.id))
      .where(eq(userNetworks.userId, userId))
      .orderBy(cryptoNetworks.nodeId);
    
    return result;
  }

  async addUserNetwork(userNetwork: InsertUserNetwork & { userId: string }): Promise<UserNetwork> {
    const id = crypto.randomUUID();
    await db.insert(userNetworks).values({ ...userNetwork, id });
    const result = await db.select().from(userNetworks).where(eq(userNetworks.id, id)).limit(1);
    if (!result[0]) throw new Error("Failed to add user network");
    return result[0];
  }

  async removeUserNetwork(userId: string, networkId: string): Promise<void> {
    await db.delete(userNetworks).where(
      and(eq(userNetworks.userId, userId), eq(userNetworks.networkId, networkId))
    );
  }

  async getUserFeature(userId: string, featureKey: string): Promise<UserFeature | undefined> {
    const result = await db.select().from(userFeatures)
      .where(and(
        eq(userFeatures.userId, userId), 
        eq(userFeatures.featureKey, featureKey as any)
      ))
      .limit(1);
    return result[0];
  }

  async getUserFeatures(userId: string): Promise<UserFeature[]> {
    return db.select().from(userFeatures).where(eq(userFeatures.userId, userId));
  }

  async setUserFeature(feature: InsertUserFeature & { userId: string }): Promise<UserFeature> {
    const existing = await this.getUserFeature(feature.userId, feature.featureKey);
    
    if (existing) {
      await db.update(userFeatures).set({
        enabled: feature.enabled,
        expiresAt: feature.expiresAt
      }).where(eq(userFeatures.id, existing.id));
      const updated = await this.getUserFeature(feature.userId, feature.featureKey);
      if (!updated) throw new Error("Failed to update feature");
      return updated;
    }
    
    const id = crypto.randomUUID();
    await db.insert(userFeatures).values({ ...feature, id });
    const result = await db.select().from(userFeatures).where(eq(userFeatures.id, id)).limit(1);
    if (!result[0]) throw new Error("Failed to set user feature");
    return result[0];
  }

  async getUserWalletApiToken(userId: string): Promise<UserWalletApiToken | undefined> {
    const result = await db.select().from(userWalletApiTokens).where(eq(userWalletApiTokens.userId, userId)).limit(1);
    return result[0];
  }

  async saveUserWalletApiToken(token: InsertUserWalletApiToken & { userId: string }): Promise<UserWalletApiToken> {
    const existing = await this.getUserWalletApiToken(token.userId);
    
    if (existing) {
      await db.update(userWalletApiTokens).set({
        encryptedApiToken: token.encryptedApiToken,
        externalUserHash: token.externalUserHash,
        refreshedAt: new Date(),
        expiresAt: token.expiresAt
      }).where(eq(userWalletApiTokens.userId, token.userId));
      const updated = await this.getUserWalletApiToken(token.userId);
      if (!updated) throw new Error("Failed to update wallet API token");
      return updated;
    }
    
    const id = crypto.randomUUID();
    await db.insert(userWalletApiTokens).values({ ...token, id });
    const result = await db.select().from(userWalletApiTokens).where(eq(userWalletApiTokens.id, id)).limit(1);
    if (!result[0]) throw new Error("Failed to save wallet API token");
    return result[0];
  }

  async updateUserWalletApiToken(userId: string, updates: Partial<InsertUserWalletApiToken>): Promise<UserWalletApiToken | undefined> {
    await db.update(userWalletApiTokens).set({
      ...updates,
      refreshedAt: new Date()
    }).where(eq(userWalletApiTokens.userId, userId));
    return this.getUserWalletApiToken(userId);
  }

  // My Memory Map methods
  async getMemoryMapMarkersByOwner(ownerId: string): Promise<MemoryMapMarker[]> {
    return db.select().from(memoryMapMarkers).where(eq(memoryMapMarkers.ownerId, ownerId)).orderBy(desc(memoryMapMarkers.createdAt));
  }

  async getSharedMemoryMapMarkers(userId: string): Promise<MemoryMapMarker[]> {
    const accessRecords = await db.select().from(memoryMapAccess).where(eq(memoryMapAccess.userId, userId));
    if (accessRecords.length === 0) return [];
    
    const markerIds = accessRecords.map(a => a.markerId);
    return db.select().from(memoryMapMarkers).where(inArray(memoryMapMarkers.id, markerIds));
  }

  async getMemoryMapMarkerById(id: string): Promise<MemoryMapMarker | null> {
    const result = await db.select().from(memoryMapMarkers).where(eq(memoryMapMarkers.id, id)).limit(1);
    return result[0] || null;
  }

  async createMemoryMapMarker(ownerId: string, data: InsertMemoryMapMarker): Promise<MemoryMapMarker> {
    const id = crypto.randomUUID();
    const insertData = {
      id,
      ownerId,
      title: data.title,
      description: data.description,
      lat: data.lat.toString(),
      lng: data.lng.toString(),
      eventDate: data.eventDate,
      icon: data.icon,
      color: data.color,
      tags: data.tags,
      blocks: data.blocks,
    };
    await db.insert(memoryMapMarkers).values(insertData as any);
    const marker = await this.getMemoryMapMarkerById(id);
    if (!marker) throw new Error("Failed to create marker");
    return marker;
  }

  async updateMemoryMapMarker(id: string, data: Partial<InsertMemoryMapMarker>): Promise<MemoryMapMarker | null> {
    const updateData: Record<string, unknown> = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.lat !== undefined && data.lat !== null) updateData.lat = String(data.lat);
    if (data.lng !== undefined && data.lng !== null) updateData.lng = String(data.lng);
    if (data.eventDate !== undefined) updateData.eventDate = data.eventDate;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.blocks !== undefined) updateData.blocks = data.blocks;
    
    if (Object.keys(updateData).length === 0) {
      return this.getMemoryMapMarkerById(id);
    }
    
    await db.update(memoryMapMarkers).set(updateData).where(eq(memoryMapMarkers.id, id));
    return this.getMemoryMapMarkerById(id);
  }

  async deleteMemoryMapMarker(id: string): Promise<boolean> {
    await db.delete(memoryMapMarkers).where(eq(memoryMapMarkers.id, id));
    return true;
  }

  async getMemoryMapMediaByMarker(markerId: string): Promise<MemoryMapMedia[]> {
    return db.select().from(memoryMapMedia).where(eq(memoryMapMedia.markerId, markerId)).orderBy(asc(memoryMapMedia.orderIndex));
  }

  async getMemoryMapMediaById(id: string): Promise<MemoryMapMedia | null> {
    const result = await db.select().from(memoryMapMedia).where(eq(memoryMapMedia.id, id)).limit(1);
    return result[0] || null;
  }

  async createMemoryMapMedia(markerId: string, data: Omit<InsertMemoryMapMedia, 'markerId'>): Promise<MemoryMapMedia> {
    const id = crypto.randomUUID();
    await db.insert(memoryMapMedia).values({
      ...data,
      id,
      markerId,
    });
    const result = await db.select().from(memoryMapMedia).where(eq(memoryMapMedia.id, id)).limit(1);
    if (!result[0]) throw new Error("Failed to create media");
    return result[0];
  }

  async deleteMemoryMapMedia(id: string): Promise<boolean> {
    await db.delete(memoryMapMedia).where(eq(memoryMapMedia.id, id));
    return true;
  }

  async reorderMemoryMapMedia(markerId: string, mediaIds: string[]): Promise<boolean> {
    for (let i = 0; i < mediaIds.length; i++) {
      await db.update(memoryMapMedia).set({ orderIndex: i }).where(
        and(eq(memoryMapMedia.id, mediaIds[i]), eq(memoryMapMedia.markerId, markerId))
      );
    }
    return true;
  }

  async getMemoryMapAccessByMarker(markerId: string): Promise<MemoryMapAccess[]> {
    return db.select().from(memoryMapAccess).where(eq(memoryMapAccess.markerId, markerId));
  }

  async getMemoryMapAccessByMarkerAndUser(markerId: string, userId: string): Promise<MemoryMapAccess | null> {
    const result = await db.select().from(memoryMapAccess).where(
      and(eq(memoryMapAccess.markerId, markerId), eq(memoryMapAccess.userId, userId))
    ).limit(1);
    return result[0] || null;
  }

  async createMemoryMapAccess(markerId: string, userId: string, role: 'viewer' | 'editor'): Promise<MemoryMapAccess> {
    const existing = await this.getMemoryMapAccessByMarkerAndUser(markerId, userId);
    if (existing) {
      const updated = await this.updateMemoryMapAccess(markerId, userId, role);
      if (!updated) throw new Error("Failed to update access");
      return updated;
    }
    
    const id = crypto.randomUUID();
    await db.insert(memoryMapAccess).values({
      id,
      markerId,
      userId,
      role,
    });
    const result = await db.select().from(memoryMapAccess).where(eq(memoryMapAccess.id, id)).limit(1);
    if (!result[0]) throw new Error("Failed to create access");
    return result[0];
  }

  async updateMemoryMapAccess(markerId: string, userId: string, role: 'viewer' | 'editor'): Promise<MemoryMapAccess | null> {
    await db.update(memoryMapAccess).set({ role }).where(
      and(eq(memoryMapAccess.markerId, markerId), eq(memoryMapAccess.userId, userId))
    );
    return this.getMemoryMapAccessByMarkerAndUser(markerId, userId);
  }

  async deleteMemoryMapAccess(markerId: string, userId: string): Promise<boolean> {
    await db.delete(memoryMapAccess).where(
      and(eq(memoryMapAccess.markerId, markerId), eq(memoryMapAccess.userId, userId))
    );
    return true;
  }

  async getUserByUsername(username: string): Promise<{ id: string; username: string | null } | null> {
    const result = await db.select({
      id: users.id,
      username: users.username
    }).from(users).where(eq(users.username, username)).limit(1);
    return result[0] || null;
  }

  // ==================== BALANCES ====================

  async getBalances(): Promise<Balance[]> {
    return db.select().from(balances).where(eq(balances.status, 1));
  }

  async getBalance(id: number): Promise<Balance | undefined> {
    const result = await db.select().from(balances).where(eq(balances.id, id)).limit(1);
    return result[0];
  }

  async getUserBalances(userId: string): Promise<(UserBalance & { balance: Balance })[]> {
    const result = await db.select({
      id: usersBalances.id,
      userId: usersBalances.userId,
      balanceId: usersBalances.balanceId,
      sum: usersBalances.sum,
      statSum: usersBalances.statSum,
      status: usersBalances.status,
      balance: balances,
    }).from(usersBalances)
      .innerJoin(balances, eq(usersBalances.balanceId, balances.id))
      .where(eq(usersBalances.userId, userId));
    return result;
  }

  async createUserBalance(userId: string, balanceId: number): Promise<UserBalance> {
    await db.insert(usersBalances).values({
      userId,
      balanceId,
    });
    const result = await db.select().from(usersBalances)
      .where(and(eq(usersBalances.userId, userId), eq(usersBalances.balanceId, balanceId)))
      .limit(1);
    if (!result[0]) throw new Error("Failed to create user balance");
    return result[0];
  }

  async ensureUserBalances(userId: string): Promise<void> {
    const activeBalances = await this.getBalances();
    const existingUserBalances = await db.select().from(usersBalances)
      .where(eq(usersBalances.userId, userId));
    
    const existingBalanceIds = new Set(existingUserBalances.map(ub => ub.balanceId));
    
    for (const balance of activeBalances) {
      if (!existingBalanceIds.has(balance.id)) {
        await this.createUserBalance(userId, balance.id);
      }
    }
  }

  // ==================== WIDGET SYSTEM ====================

  async getGridPresets(): Promise<GridPreset[]> {
    return db.select().from(gridPresets).where(eq(gridPresets.isActive, true)).orderBy(asc(gridPresets.order));
  }

  async getGridPreset(id: string): Promise<GridPreset | undefined> {
    const result = await db.select().from(gridPresets).where(eq(gridPresets.id, id)).limit(1);
    return result[0];
  }

  async getWidgetsCatalog(): Promise<WidgetCatalogItem[]> {
    return db.select().from(widgetsCatalog).where(eq(widgetsCatalog.isActive, true)).orderBy(asc(widgetsCatalog.order));
  }

  async getUserWidgetLayout(userId: string): Promise<UserWidgetLayout | undefined> {
    const result = await db.select().from(userWidgetLayouts)
      .where(and(eq(userWidgetLayouts.userId, userId), eq(userWidgetLayouts.isActive, true)))
      .limit(1);
    return result[0];
  }

  async saveUserWidgetLayout(userId: string, data: { presetId: string; slotsMapping: SlotMapping[] }): Promise<UserWidgetLayout> {
    const existing = await this.getUserWidgetLayout(userId);
    
    if (existing) {
      await db.update(userWidgetLayouts)
        .set({ presetId: data.presetId, slotsMapping: data.slotsMapping })
        .where(eq(userWidgetLayouts.id, existing.id));
      const result = await db.select().from(userWidgetLayouts).where(eq(userWidgetLayouts.id, existing.id)).limit(1);
      if (!result[0]) throw new Error("Failed to update layout");
      return result[0];
    } else {
      const id = crypto.randomUUID();
      await db.insert(userWidgetLayouts).values({
        id,
        userId,
        presetId: data.presetId,
        slotsMapping: data.slotsMapping,
      });
      const result = await db.select().from(userWidgetLayouts).where(eq(userWidgetLayouts.id, id)).limit(1);
      if (!result[0]) throw new Error("Failed to create layout");
      return result[0];
    }
  }

  // Count methods for widgets
  async getUserNotesCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(notes).where(eq(notes.userId, userId));
    return Number(result[0]?.count || 0);
  }

  async getUserTasksCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(tasks).where(eq(tasks.userId, userId));
    return Number(result[0]?.count || 0);
  }

  async getUserGoalsCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(goals).where(eq(goals.userId, userId));
    return Number(result[0]?.count || 0);
  }

  async getNotesByUser(userId: string): Promise<Note[]> {
    return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt)).limit(10);
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)).limit(10);
  }
}

export const storage = new DatabaseStorage();
