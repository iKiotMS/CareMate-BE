import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import {
  TaskCatalog,
  TaskCatalogDocument,
} from '../../tasks/schemas/task-catalog.schema';
import { CreateOrderDto, SubmitReviewDto } from '../dtos/order.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/dtos/notification.dto';

const CUSTOMER_CANCELLABLE = ['PENDING'];
const ADMIN_CANCELLABLE = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'];

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TaskCatalog.name)
    private taskCatalogModel: Model<TaskCatalogDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async withUserNames<T extends any>(orders: T[]): Promise<T[]> {
    const userIds = Array.from(
      new Set(
        orders
          .flatMap((order: any) => [order.customerId, order.cleanerId])
          .filter(Boolean)
          .map((id: any) => id.toString()),
      ),
    );

    if (userIds.length === 0) return orders;

    const users = await this.userModel
      .find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
      .select('fullName')
      .lean();
    const nameById = new Map(
      (users as any[]).map((user) => [user._id.toString(), user.fullName]),
    );

    return orders.map((order: any) => ({
      ...order,
      customerName: nameById.get(order.customerId?.toString()) ?? null,
      cleanerName: order.cleanerId
        ? (nameById.get(order.cleanerId.toString()) ?? null)
        : null,
    }));
  }

  private async withUserName<T extends any>(order: T): Promise<T> {
    const [withNames] = await this.withUserNames([order]);
    return withNames;
  }

  private validateBookingDate(scheduledDate: string, scheduledTime: string): void {
    const orderDate = new Date(scheduledDate);
    orderDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (orderDate < today)
      throw new BadRequestException('Cannot book a cleaning in the past');

    if (orderDate.getTime() === today.getTime()) {
      const slotStart = scheduledTime.split(' - ')[0];
      const [h, m] = slotStart.split(':').map(Number);
      const slotMs = new Date();
      slotMs.setHours(h, m, 0, 0);
      if (slotMs.getTime() < Date.now() + 60 * 60 * 1000)
        throw new BadRequestException('Selected time slot has already passed');
    }
  }

  private async checkCustomerDuplicate(
    customerId: string,
    scheduledDate: string,
    scheduledTime: string,
  ): Promise<void> {
    const dup = await this.orderModel.findOne({
      customerId: new Types.ObjectId(customerId),
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status: { $in: ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] },
    });
    if (dup) throw new ConflictException('You already have a booking at this time');
  }

  async createOrder(
    customerId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException(`Invalid customer id: ${customerId}`);
    }

    this.validateBookingDate(createOrderDto.scheduledDate, createOrderDto.scheduledTime);
    await this.checkCustomerDuplicate(
      customerId,
      createOrderDto.scheduledDate,
      createOrderDto.scheduledTime,
    );

    const catalogItems = await this.taskCatalogModel.find({
      _id: { $in: createOrderDto.taskIds.map((id) => new Types.ObjectId(id)) },
      isActive: true,
    });
    if (catalogItems.length !== createOrderDto.taskIds.length)
      throw new BadRequestException('One or more tasks are invalid or inactive');

    const tasks = (catalogItems as any[]).map((t) => ({
      taskCatalogId: t._id,
      taskName: t.name,
      taskPrice: t.price ?? 0,
      isDone: false,
      completedAt: null,
      photoBefore: null,
      photoAfter: null,
    }));

    const totalAmount = tasks.reduce((sum, t) => sum + t.taskPrice, 0);

    const order = new this.orderModel({
      customerId: new Types.ObjectId(customerId),
      status: 'PENDING',
      scheduledDate: new Date(createOrderDto.scheduledDate),
      scheduledTime: createOrderDto.scheduledTime,
      address: createOrderDto.address,
      note: createOrderDto.note || null,
      photosBeforeBooking: createOrderDto.photosBeforeBooking || [],
      paymentMethod: createOrderDto.paymentMethod ?? 'CASH',
      paymentStatus: 'UNPAID',
      totalAmount,
      tasks,
    });

    await order.save();

    await this.notificationsService.create({
      recipientId: customerId,
      type: NotificationType.ORDER_CREATED,
      title: 'Booking Confirmed',
      body: `Your cleaning order has been placed for ${createOrderDto.scheduledDate}.`,
      referenceId: order._id.toString(),
      referenceType: 'order',
    });

    return order;
  }

  async getOrderById(orderId: string): Promise<Order> {
    const order = await this.orderModel
      .findById(new Types.ObjectId(orderId))
      .lean();
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return this.withUserName(order);
  }

  async getCustomerOrders(customerId: string, status?: string): Promise<Order[]> {
    const query: any = { customerId: new Types.ObjectId(customerId) };
    if (status) query.status = status;
    const orders = await this.orderModel.find(query).lean();
    return this.withUserNames(orders);
  }

  async getAllOrders(filters?: any): Promise<Order[]> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.cleanerId)
      query.cleanerId = new Types.ObjectId(filters.cleanerId);
    if (filters?.customerId)
      query.customerId = new Types.ObjectId(filters.customerId);
    if (filters?.startDate || filters?.endDate) {
      query.scheduledDate = {};
      if (filters.startDate)
        query.scheduledDate.$gte = new Date(filters.startDate);
      if (filters.endDate)
        query.scheduledDate.$lte = new Date(filters.endDate);
    }
    const orders = await this.orderModel.find(query).lean();
    return this.withUserNames(orders);
  }

  async assignCleaner(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot assign cleaner to order in ${order.status} status`,
      );
    }

    order.cleanerId = new Types.ObjectId(cleanerId);
    order.status = 'ASSIGNED';
    await order.save();

    await Promise.all([
      this.notificationsService.create({
        recipientId: order.customerId.toString(),
        type: NotificationType.CLEANER_ASSIGNED,
        title: 'Cleaner Assigned',
        body: 'A cleaner has been assigned to your order.',
        referenceId: orderId,
        referenceType: 'order',
      }),
      this.notificationsService.create({
        recipientId: cleanerId,
        type: NotificationType.JOB_ASSIGNED,
        title: 'New Job Assigned',
        body: 'You have been assigned a new cleaning job.',
        referenceId: orderId,
        referenceType: 'order',
      }),
    ]);

    return order.toObject();
  }

  async reassignCleaner(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (!['ASSIGNED', 'ACCEPTED'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot reassign cleaner when order is ${order.status}`,
      );
    }

    order.cleanerId = new Types.ObjectId(cleanerId);
    order.status = 'ASSIGNED';
    return order.save();
  }

  async acceptJob(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== 'ASSIGNED') {
      throw new BadRequestException(
        `Cannot accept order in ${order.status} status`,
      );
    }
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException('Cleaner is not assigned to this order');
    }

    order.status = 'ACCEPTED';
    return order.save();
  }

  async checkIn(
    orderId: string,
    cleanerId: string,
    photosCheckin: string[],
  ): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== 'ACCEPTED') {
      throw new BadRequestException(
        `Cannot check-in order in ${order.status} status`,
      );
    }
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException('Cleaner is not assigned to this order');
    }

    order.status = 'IN_PROGRESS';
    order.photosCheckin = photosCheckin;
    await order.save();

    await this.notificationsService.create({
      recipientId: order.customerId.toString(),
      type: NotificationType.CLEANER_CHECKED_IN,
      title: 'Cleaner Arrived',
      body: 'Your cleaner has checked in and started working.',
      referenceId: orderId,
      referenceType: 'order',
    });

    return order.toObject();
  }

  async markTaskDone(
    orderId: string,
    taskCatalogId: string,
    photoBefore?: string,
    photoAfter?: string,
  ): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot mark task done when order is ${order.status}`,
      );
    }

    const task = order.tasks.find(
      (t) => t.taskCatalogId.toString() === taskCatalogId,
    );
    if (!task)
      throw new BadRequestException(`Task ${taskCatalogId} not found in order`);

    task.isDone = true;
    task.completedAt = new Date();
    if (photoBefore) task.photoBefore = photoBefore;
    if (photoAfter) task.photoAfter = photoAfter;
    return order.save();
  }

  async completeOrder(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.cleanerId?.toString() !== cleanerId)
      throw new ForbiddenException('Access denied');
    if (order.status !== 'IN_PROGRESS')
      throw new BadRequestException('Order is not in progress');

    const allDone = order.tasks.every(
      (t) => t.isDone && t.photoBefore && t.photoAfter,
    );
    if (!allDone)
      throw new BadRequestException(
        'All tasks must be completed with before and after photos',
      );

    order.status = 'REVIEW_PENDING';
    await order.save();

    await this.notificationsService.create({
      recipientId: order.customerId.toString(),
      type: NotificationType.ORDER_COMPLETED,
      title: 'Cleaning Complete!',
      body: 'Your cleaning is done. Please leave a review for your cleaner.',
      referenceId: orderId,
      referenceType: 'order',
    });

    return order.toObject();
  }

  async cancelOrder(
    orderId: string,
    cancelledBy: 'customer' | 'admin',
    reason?: string,
  ): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const allowed =
      cancelledBy === 'customer' ? CUSTOMER_CANCELLABLE : ADMIN_CANCELLABLE;
    if (!allowed.includes(order.status))
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );

    order.status = 'CANCELLED';
    order.cancelledBy = cancelledBy;
    order.cancelledReason = reason ?? null;
    await order.save();

    const notifications: Promise<void>[] = [];
    if (order.customerId) {
      notifications.push(
        this.notificationsService.create({
          recipientId: order.customerId.toString(),
          type: NotificationType.ORDER_CANCELLED,
          title: 'Order Cancelled',
          body: `Your order has been cancelled. Reason: ${reason ?? 'N/A'}`,
          referenceId: orderId,
          referenceType: 'order',
        }),
      );
    }
    if (order.cleanerId) {
      notifications.push(
        this.notificationsService.create({
          recipientId: order.cleanerId.toString(),
          type: NotificationType.ORDER_CANCELLED,
          title: 'Job Cancelled',
          body: 'An assigned job has been cancelled.',
          referenceId: orderId,
          referenceType: 'order',
        }),
      );
    }
    await Promise.all(notifications);

    return order.toObject();
  }

  async submitReview(
    orderId: string,
    customerId: string,
    reviewDto: SubmitReviewDto,
  ): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.customerId.toString() !== customerId)
      throw new ForbiddenException('Access denied');
    if (order.status !== 'REVIEW_PENDING')
      throw new BadRequestException(
        'Review can only be submitted when order is awaiting review',
      );
    if (order.rating !== null && order.rating !== undefined)
      throw new ConflictException('Review already submitted');

    order.rating = reviewDto.rating;
    order.review = reviewDto.comment ?? null;
    order.status = 'COMPLETED';
    await order.save();

    const notifications: Promise<void>[] = [];

    if (order.cleanerId) {
      notifications.push(
        this.notificationsService.create({
          recipientId: order.cleanerId.toString(),
          type: NotificationType.NEW_REVIEW_RECEIVED,
          title: 'New Review Received',
          body: `You received a ${reviewDto.rating}-star review.`,
          referenceId: orderId,
          referenceType: 'order',
        }),
      );
    }

    if (reviewDto.rating <= 2) {
      const admins = await this.userModel.find({ role: 'admin', isActive: true });
      for (const admin of admins) {
        notifications.push(
          this.notificationsService.create({
            recipientId: (admin as any)._id.toString(),
            type: NotificationType.LOW_RATING_ALERT,
            title: 'Low Rating Alert',
            body: `Order received a ${reviewDto.rating}-star rating. Please review.`,
            referenceId: orderId,
            referenceType: 'order',
          }),
        );
      }
    }

    await Promise.all(notifications);

    return order.toObject();
  }

  async getCleanerAssignedJobs(cleanerId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        cleanerId: new Types.ObjectId(cleanerId),
        status: { $in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] },
      })
      .lean();
  }

  async getCleanerCompletedOrders(cleanerId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        cleanerId: new Types.ObjectId(cleanerId),
        status: 'COMPLETED',
      })
      .lean();
  }

  async getAvailableOrders(cleanerId?: string): Promise<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await this.orderModel
      .find({
        status: 'PENDING',
        scheduledDate: { $gte: today },
      })
      .lean();

    if (!cleanerId) return orders;

    const available: Order[] = [];
    for (const order of orders) {
      const conflict = await this.getCleanerScheduleConflict(
        cleanerId,
        order.scheduledDate,
        order.scheduledTime,
      );
      if (!conflict) available.push(order);
    }
    return available;
  }

  async getCleanerScheduleConflict(
    cleanerId: string,
    scheduledDate: Date,
    scheduledTime: string,
  ): Promise<Order | null> {
    const conflict = await this.orderModel
      .findOne({
        cleanerId: new Types.ObjectId(cleanerId),
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        status: { $in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] },
      })
      .lean();
    return conflict || null;
  }

  async applyForOrder(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot apply for order in ${order.status} status`,
      );
    }

    const conflict = await this.getCleanerScheduleConflict(
      cleanerId,
      order.scheduledDate,
      order.scheduledTime,
    );
    if (conflict) {
      throw new BadRequestException(
        'You already have an order scheduled for this time',
      );
    }

    order.cleanerId = new Types.ObjectId(cleanerId);
    order.status = 'ASSIGNED';
    await order.save();

    await Promise.all([
      this.notificationsService.create({
        recipientId: order.customerId.toString(),
        type: NotificationType.CLEANER_ASSIGNED,
        title: 'Cleaner Assigned',
        body: 'A cleaner has been assigned to your order.',
        referenceId: orderId,
        referenceType: 'order',
      }),
      this.notificationsService.create({
        recipientId: cleanerId,
        type: NotificationType.JOB_ASSIGNED,
        title: 'New Job Assigned',
        body: 'You have been assigned a new cleaning job.',
        referenceId: orderId,
        referenceType: 'order',
      }),
    ]);

    return order.toObject();
  }

  async getDashboardStats(): Promise<any> {
    const stats = await this.orderModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result: any = {
      total: 0,
      PENDING: 0,
      ASSIGNED: 0,
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      REVIEW_PENDING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    for (const stat of stats) {
      result[stat._id] = stat.count;
      result.total += stat.count;
    }

    return result;
  }
}
