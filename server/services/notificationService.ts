import { storage } from "../storage";
import type { InsertNotification, UserNotificationSettings } from "@shared/schema";

type NotificationType = 'lead_assigned' | 'appointment_reminder' | 'deal_update' | 'task_due' | 'system';

interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, any>;
}

class NotificationService {
  async getNotificationEmail(userId: string): Promise<string | null> {
    const settings = await storage.getNotificationSettings(userId);
    if (settings?.notificationEmail) {
      return settings.notificationEmail;
    }
    const user = await storage.getUser(userId);
    return user?.email || null;
  }

  private getSettingKey(type: NotificationType): keyof UserNotificationSettings {
    const mapping: Record<NotificationType, keyof UserNotificationSettings> = {
      lead_assigned: 'leadAssignedEnabled',
      appointment_reminder: 'appointmentReminderEnabled',
      deal_update: 'dealUpdateEnabled',
      task_due: 'taskDueEnabled',
      system: 'systemEnabled',
    };
    return mapping[type];
  }

  private isQuietHours(settings: UserNotificationSettings): boolean {
    if (!settings.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Chicago'
    });

    const start = settings.quietHoursStart || '22:00';
    const end = settings.quietHoursEnd || '07:00';

    if (start < end) {
      return currentTime >= start && currentTime < end;
    } else {
      return currentTime >= start || currentTime < end;
    }
  }

  async createNotification(userId: string, data: NotificationData) {
    try {
      let settings = await storage.getNotificationSettings(userId);
      
      if (!settings) {
        settings = await storage.upsertNotificationSettings({ userId });
      }

      if (!settings.notificationsEnabled) {
        console.log(`[NotificationService] Notifications disabled for user ${userId}`);
        return null;
      }

      const settingKey = this.getSettingKey(data.type);
      if (!settings[settingKey]) {
        console.log(`[NotificationService] ${data.type} notifications disabled for user ${userId}`);
        return null;
      }

      if (this.isQuietHours(settings)) {
        console.log(`[NotificationService] Quiet hours active for user ${userId}`);
        return null;
      }

      const notification = await storage.createNotification({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        payload: data.payload,
      });

      console.log(`[NotificationService] Created notification for user ${userId}: ${data.title}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
      return null;
    }
  }

  async createLeadAssignedNotification(userId: string, leadName: string, leadSource?: string, payload?: Record<string, any>) {
    return this.createNotification(userId, {
      type: 'lead_assigned',
      title: 'New Lead Assigned',
      message: leadSource ? `${leadName} - ${leadSource}` : leadName,
      payload,
    });
  }

  async createAppointmentReminderNotification(userId: string, appointmentTitle: string, startTime: string, payload?: Record<string, any>) {
    return this.createNotification(userId, {
      type: 'appointment_reminder',
      title: 'Upcoming Appointment',
      message: `${appointmentTitle} - ${startTime}`,
      payload,
    });
  }

  async createDealUpdateNotification(userId: string, propertyAddress: string, newStage: string, payload?: Record<string, any>) {
    return this.createNotification(userId, {
      type: 'deal_update',
      title: 'Deal Status Updated',
      message: `${propertyAddress} moved to ${newStage}`,
      payload,
    });
  }

  async createTaskDueNotification(userId: string, taskTitle: string, payload?: Record<string, any>) {
    return this.createNotification(userId, {
      type: 'task_due',
      title: 'Task Due Today',
      message: taskTitle,
      payload,
    });
  }

  async createSystemNotification(userId: string, title: string, message: string, payload?: Record<string, any>) {
    return this.createNotification(userId, {
      type: 'system',
      title,
      message,
      payload,
    });
  }
}

export const notificationService = new NotificationService();
