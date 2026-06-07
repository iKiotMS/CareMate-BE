import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationPayload, MarkNotificationsReadDto } from './dtos/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(payload: CreateNotificationPayload): Promise<void> {
    await this.notificationModel.create(payload);
  }

  async getMyNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.notificationModel
        .find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments({ recipientId: userId }),
    ]);
    return { data, total, page, limit };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationModel.countDocuments({
      recipientId: userId,
      isRead: false,
    });
    return { count };
  }

  async markAsRead(userId: string, ids: string[]): Promise<void> {
    await this.notificationModel.updateMany(
      { _id: { $in: ids }, recipientId: userId },
      { $set: { isRead: true } },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true } },
    );
  }
}
