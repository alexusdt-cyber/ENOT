import { storage } from "./storage";
import type { Notification, InsertNotification } from "@shared/schema";

export interface CreateNotificationOptions {
  userId: string;
  categoryKey: string;
  typeKey?: string;
  title: string;
  body?: string;
  sourceType?: "task" | "note" | "milestone" | "roadmap" | "other";
  sourceId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

class NotificationService {
  async createNotification(options: CreateNotificationOptions): Promise<Notification | null> {
    try {
      const category = await storage.getNotificationCategoryByKey(options.categoryKey);
      if (!category) {
        console.error(`Notification category not found: ${options.categoryKey}`);
        return null;
      }

      let typeId: string | null = null;
      if (options.typeKey) {
        const type = await storage.getNotificationTypeByKey(options.categoryKey, options.typeKey);
        if (type) {
          typeId = type.id;
        }
      }

      const notificationData: InsertNotification = {
        userId: options.userId,
        categoryId: category.id,
        typeId,
        title: options.title,
        body: options.body,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
        actionUrl: options.actionUrl,
        metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
        status: "unread"
      };

      return await storage.createNotification(notificationData);
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  async notifyTaskDueSoon(userId: string, taskId: string, taskTitle: string): Promise<Notification | null> {
    return this.createNotification({
      userId,
      categoryKey: "tasks",
      typeKey: "task_due_soon",
      title: "Напоминание о задаче",
      body: `Задача "${taskTitle}" истекает через час`,
      sourceType: "task",
      sourceId: taskId,
      actionUrl: `/tasks`,
      metadata: { taskId, taskTitle }
    });
  }

  async notifyNoteTasklistDue(userId: string, noteId: string, noteTitle: string, taskItem: string): Promise<Notification | null> {
    return this.createNotification({
      userId,
      categoryKey: "notes",
      typeKey: "tasklist_due_soon",
      title: "Напоминание о чек-листе",
      body: `Пункт "${taskItem}" в блокноте "${noteTitle}" требует внимания`,
      sourceType: "note",
      sourceId: noteId,
      actionUrl: `/notes/${noteId}`,
      metadata: { noteId, noteTitle, taskItem }
    });
  }

  async notifyMilestoneCompleted(userId: string, milestoneId: string, milestoneName: string, roadmapName: string): Promise<Notification | null> {
    return this.createNotification({
      userId,
      categoryKey: "roadmap",
      typeKey: "milestone_completed",
      title: "Поздравляем!",
      body: `Вы выполнили веху "${milestoneName}" в дорожной карте "${roadmapName}"`,
      sourceType: "milestone",
      sourceId: milestoneId,
      actionUrl: `/roadmap`,
      metadata: { milestoneId, milestoneName, roadmapName }
    });
  }

  async getUnreadCount(userId: string): Promise<{ total: number; byCategory: Record<string, number> }> {
    return storage.getUnreadNotificationCount(userId);
  }

  async getUserNotifications(userId: string, options?: { categoryKey?: string; status?: string; limit?: number }): Promise<Notification[]> {
    return storage.getNotifications(userId, options);
  }

  async markAsRead(notificationId: string): Promise<Notification | undefined> {
    return storage.markNotificationRead(notificationId);
  }

  async markAllAsRead(userId: string, categoryKey?: string): Promise<void> {
    return storage.markAllNotificationsRead(userId, categoryKey);
  }
}

export const notificationService = new NotificationService();
