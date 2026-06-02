import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../schemas/order.schema";
import {
  CreateOrderDto,
  AssignCleanerDto,
  SubmitReviewDto,
  CancelOrderDto,
} from "../dtos/order.dto";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async createOrder(
    customerId: string,
    createOrderDto: CreateOrderDto,
    taskNamesById: Record<string, string> = {},
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException(`Invalid customer id: ${customerId}`);
    }
    const invalidTaskId = createOrderDto.taskIds.find(
      (id) => !Types.ObjectId.isValid(id),
    );
    if (invalidTaskId) {
      throw new BadRequestException(`Invalid task id: ${invalidTaskId}`);
    }

    const taskIds = createOrderDto.taskIds.map((id) => new Types.ObjectId(id));
    const now = new Date();

    const order = new this.orderModel({
      customerId: new Types.ObjectId(customerId),
      status: "PENDING",
      scheduledDate: new Date(createOrderDto.scheduledDate),
      scheduledTime: createOrderDto.scheduledTime,
      address: createOrderDto.address,
      note: createOrderDto.note || null,
      photosBeforeBooking: createOrderDto.photosBeforeBooking || [],
      tasks: taskIds.map((taskId) => ({
        taskCatalogId: taskId,
        taskName: taskNamesById[taskId.toString()] || "", // Populate before first save
        isDone: false,
        completedAt: null,
      })),
      createdAt: now,
      updatedAt: now,
    });

    return order.save();
  }

  async getOrderById(orderId: string): Promise<Order> {
    const order = await this.orderModel
      .findById(new Types.ObjectId(orderId))
      .lean();
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return order;
  }

  async getCustomerOrders(
    customerId: string,
    status?: string,
  ): Promise<Order[]> {
    const query: any = { customerId: new Types.ObjectId(customerId) };
    if (status) {
      query.status = status;
    }
    return this.orderModel.find(query).lean();
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
      if (filters.endDate) query.scheduledDate.$lte = new Date(filters.endDate);
    }
    return this.orderModel.find(query).lean();
  }

  async assignCleaner(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "PENDING") {
      throw new BadRequestException(
        `Cannot assign cleaner to order in ${order.status} status`,
      );
    }

    order.cleanerId = new Types.ObjectId(cleanerId);
    order.status = "ASSIGNED";
    return order.save();
  }

  async reassignCleaner(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (!["ASSIGNED", "ACCEPTED"].includes(order.status)) {
      throw new BadRequestException(
        `Cannot reassign cleaner when order is ${order.status}`,
      );
    }

    order.cleanerId = new Types.ObjectId(cleanerId);
    order.status = "ASSIGNED";
    return order.save();
  }

  async acceptJob(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "ASSIGNED") {
      throw new BadRequestException(
        `Cannot accept order in ${order.status} status`,
      );
    }
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException("Cleaner is not assigned to this order");
    }

    order.status = "ACCEPTED";
    return order.save();
  }

  async checkIn(
    orderId: string,
    cleanerId: string,
    photosCheckin: string[],
  ): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "ACCEPTED") {
      throw new BadRequestException(
        `Cannot check-in order in ${order.status} status`,
      );
    }
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException("Cleaner is not assigned to this order");
    }

    order.status = "IN_PROGRESS";
    order.photosCheckin = photosCheckin;
    return order.save();
  }

  async markTaskDone(
    orderId: string,
    taskCatalogId: string,
    photoBefore?: string,
    photoAfter?: string,
  ): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        `Cannot mark task done when order is ${order.status}`,
      );
    }

    const task = order.tasks.find(
      (t) => t.taskCatalogId.toString() === taskCatalogId,
    );
    if (!task) {
      throw new BadRequestException(`Task ${taskCatalogId} not found in order`);
    }

    task.isDone = true;
    task.completedAt = new Date();
    if (photoBefore) task.photoBefore = photoBefore;
    if (photoAfter) task.photoAfter = photoAfter;
    return order.save();
  }

  async completeOrder(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "IN_PROGRESS") {
      throw new BadRequestException(
        `Cannot complete order in ${order.status} status`,
      );
    }
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException("Cleaner is not assigned to this order");
    }

    const allTasksDone = order.tasks.every((t) => t.isDone);
    if (!allTasksDone) {
      throw new BadRequestException(
        "All tasks must be marked done before completing",
      );
    }

    const allTasksHavePhotos = order.tasks.every(
      (t) => t.photoBefore && t.photoAfter,
    );
    if (!allTasksHavePhotos) {
      throw new BadRequestException(
        "All tasks must have before and after photos",
      );
    }

    order.status = "REVIEW_PENDING";
    return order.save();
  }

  async cancelOrder(
    orderId: string,
    cancelledBy: "customer" | "admin",
    reason?: string,
  ): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (cancelledBy === "customer" && order.status !== "PENDING") {
      throw new BadRequestException("Customer can only cancel PENDING orders");
    }
    if (cancelledBy === "admin" && order.status === "COMPLETED") {
      throw new BadRequestException("Cannot cancel COMPLETED orders");
    }

    order.status = "CANCELLED";
    order.cancelledBy = cancelledBy;
    order.cancelledReason = reason || null;
    return order.save();
  }

  async submitReview(
    orderId: string,
    customerId: string,
    reviewDto: SubmitReviewDto,
  ): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.customerId.toString() !== customerId) {
      throw new BadRequestException("This order does not belong to you");
    }
    if (!["REVIEW_PENDING", "COMPLETED"].includes(order.status)) {
      throw new BadRequestException("Can only review completed orders");
    }
    if (order.rating !== null && order.rating !== undefined) {
      throw new BadRequestException("Review already submitted");
    }

    order.rating = reviewDto.rating;
    order.review = reviewDto.comment || null;
    // Move from REVIEW_PENDING to COMPLETED when customer submits review
    if (order.status === "REVIEW_PENDING") {
      order.status = "COMPLETED";
    }
    return order.save();
  }

  async getCleanerAssignedJobs(cleanerId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        cleanerId: new Types.ObjectId(cleanerId),
        status: { $in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
      })
      .lean();
  }

  async getCleanerCompletedOrders(cleanerId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        cleanerId: new Types.ObjectId(cleanerId),
        status: "COMPLETED",
      })
      .lean();
  }

  async getAvailableOrders(cleanerId?: string): Promise<Order[]> {
  const orders = await this.orderModel.find({ status: "PENDING" }).lean();

  if (!cleanerId) {
    return orders;
  }

  const available: Order[] = [];

  for (const order of orders) {
    const conflict = await this.getCleanerScheduleConflict(
      cleanerId,
      order.scheduledDate,
      order.scheduledTime,
    );

    if (!conflict) {
      available.push(order);
    }
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
        scheduledTime: scheduledTime,
        status: { $in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
      })
      .lean();
    return conflict || null;
  }

  async applyForOrder(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "PENDING") {
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
        "You already have an order scheduled for this time",
      );
    }

    order.cleanerId = new Types.ObjectId(cleanerId);
    order.status = "ASSIGNED";
    return order.save();
  }

  async getDashboardStats(): Promise<any> {
    const stats = await this.orderModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
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
