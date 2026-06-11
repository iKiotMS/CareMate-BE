import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../schemas/order.schema";
import { User, UserDocument } from "../../users/schemas/user.schema";
import {
  TaskCatalog,
  TaskCatalogDocument,
} from "../../tasks/schemas/task-catalog.schema";
import { CreateOrderDto, SubmitReviewDto } from "../dtos/order.dto";
import { NotificationsService } from "../../notifications/notifications.service";
import { NotificationType } from "../../notifications/dtos/notification.dto";
import {
  DepositService,
  DepositInfo,
  DEPOSIT_AMOUNT,
} from "../../payments/services/deposit.service";
import { FinalPaymentService } from "../../payments/services/final-payment.service";

const CUSTOMER_CANCELLABLE = ["PENDING", "ON_HOLD_PAYMENT"];
const ADMIN_CANCELLABLE = [
  "PENDING",
  "ON_HOLD_PAYMENT",
  "CONFIRMED",
  "ACCEPTED",
  "IN_PROGRESS",
];

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TaskCatalog.name)
    private taskCatalogModel: Model<TaskCatalogDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly depositService: DepositService,
    private readonly finalPaymentService: FinalPaymentService,
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
      .select("fullName phone")
      .lean();
    const userById = new Map(
      (users as any[]).map((user) => [user._id.toString(), user]),
    );

    return orders.map((order: any) => {
      const customer = userById.get(order.customerId?.toString());
      const cleaner = order.cleanerId
        ? userById.get(order.cleanerId.toString())
        : null;
      return {
        ...order,
        customerName: customer?.fullName ?? null,
        customerPhone: customer?.phone ?? null,
        cleanerName: cleaner?.fullName ?? null,
      };
    });
  }

  private async withUserName<T extends any>(order: T): Promise<T> {
    const [withNames] = await this.withUserNames([order]);
    return withNames;
  }

  private validateBookingDate(
    scheduledDate: string,
    scheduledTime: string,
  ): void {
    const orderDate = new Date(scheduledDate);
    orderDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (orderDate < today)
      throw new BadRequestException("Cannot book a cleaning in the past");

    if (orderDate.getTime() === today.getTime()) {
      const slotStart = scheduledTime.split(" - ")[0];
      const [h, m] = slotStart.split(":").map(Number);
      const slotMs = new Date();
      slotMs.setHours(h, m, 0, 0);
      if (slotMs.getTime() < Date.now() + 60 * 60 * 1000)
        throw new BadRequestException("Selected time slot has already passed");
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
      status: {
        $in: [
          "PENDING",
          "ON_HOLD_PAYMENT",
          "CONFIRMED",
          "ACCEPTED",
          "IN_PROGRESS",
        ],
      },
    });
    if (dup)
      throw new ConflictException("You already have a booking at this time");
  }

  async createOrder(
    customerId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException(`Invalid customer id: ${customerId}`);
    }

    this.validateBookingDate(
      createOrderDto.scheduledDate,
      createOrderDto.scheduledTime,
    );
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
      throw new BadRequestException(
        "One or more tasks are invalid or inactive",
      );

    const areaM2 = createOrderDto.areaM2;
    const tasks = (catalogItems as any[]).map((t) => {
      const basePrice = t.price ?? 0;
      const perM2 = t.pricePerM2 ?? 10000;
      return {
        taskCatalogId: t._id,
        taskName: t.name,
        taskPrice: basePrice + areaM2 * perM2,
        isDone: false,
        completedAt: null,
        photoBefore: null,
        photoAfter: null,
      };
    });

    const totalAmount = tasks.reduce((sum, t) => sum + t.taskPrice, 0);

    if (totalAmount <= DEPOSIT_AMOUNT) {
      throw new BadRequestException(
        `Tổng giá trị đơn (${totalAmount.toLocaleString("vi-VN")} ₫) phải lớn hơn tiền đặt cọc (${DEPOSIT_AMOUNT.toLocaleString("vi-VN")} ₫). Hãy chọn thêm dịch vụ hoặc nhập diện tích lớn hơn.`,
      );
    }

    const order = new this.orderModel({
      customerId: new Types.ObjectId(customerId),
      status: "PENDING",
      scheduledDate: new Date(createOrderDto.scheduledDate),
      scheduledTime: createOrderDto.scheduledTime,
      address: createOrderDto.address,
      note: createOrderDto.note || null,
      photosBeforeBooking: createOrderDto.photosBeforeBooking || [],
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: "UNPAID",
      totalAmount,
      areaM2,
      tasks,
      applicants: [],
    });

    await order.save();

    await this.notificationsService.create({
      recipientId: customerId,
      type: NotificationType.ORDER_CREATED,
      title: "Đặt đơn thành công",
      body: `Đơn dọn dẹp của bạn đã được đặt vào ${createOrderDto.scheduledDate}. Đang chờ nhân viên ứng tuyển.`,
      referenceId: order._id.toString(),
      referenceType: "order",
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

  async getCustomerOrders(
    customerId: string,
    status?: string,
  ): Promise<Order[]> {
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
      if (filters.endDate) query.scheduledDate.$lte = new Date(filters.endDate);
    }
    const orders = await this.orderModel.find(query).lean();
    return this.withUserNames(orders);
  }

  // ─── Applicants ────────────────────────────────────────────────────────────

  async getOrderApplicants(
    orderId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<any[]> {
    const order = await this.orderModel
      .findById(new Types.ObjectId(orderId))
      .lean();
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (
      requesterRole === "customer" &&
      (order as any).customerId.toString() !== requesterId
    ) {
      throw new ForbiddenException("Access denied");
    }

    const applicants: any[] = (order as any).applicants ?? [];
    if (applicants.length === 0) return [];

    const cleanerIds = applicants.map(
      (a: any) => new Types.ObjectId(a.cleanerId),
    );
    const cleaners = await this.userModel
      .find({ _id: { $in: cleanerIds } })
      .select("fullName avatarUrl rating completedJobs")
      .lean();

    const cleanerMap = new Map(
      (cleaners as any[]).map((c) => [c._id.toString(), c]),
    );

    return applicants.map((a: any) => {
      const cleaner = cleanerMap.get(a.cleanerId.toString()) ?? {};
      return {
        cleanerId: a.cleanerId,
        cleanerName: (cleaner as any).fullName ?? null,
        cleanerAvatar: (cleaner as any).avatarUrl ?? null,
        cleanerRating: (cleaner as any).rating ?? null,
        completedJobs: (cleaner as any).completedJobs ?? 0,
        appliedAt: a.appliedAt,
        status: a.status,
      };
    });
  }

  // ─── New flow: cleaner applies (no auto-assign) ─────────────────────────────

  async applyForOrder(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "PENDING") {
      throw new BadRequestException(
        `Cannot apply for order in ${order.status} status`,
      );
    }

    const applicants: any[] = (order as any).applicants ?? [];
    const alreadyApplied = applicants.some(
      (a: any) => a.cleanerId.toString() === cleanerId,
    );
    if (alreadyApplied)
      throw new ConflictException("You have already applied for this order");

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

    applicants.push({
      cleanerId: new Types.ObjectId(cleanerId),
      appliedAt: new Date(),
      status: "PENDING",
    });
    (order as any).applicants = applicants;
    await order.save();

    await this.notificationsService.create({
      recipientId: order.customerId.toString(),
      type: NotificationType.CLEANER_APPLIED,
      title: "Có nhân viên ứng tuyển",
      body: "Một nhân viên đã ứng tuyển cho đơn của bạn. Hãy xem hồ sơ và chọn nhân viên phù hợp.",
      referenceId: orderId,
      referenceType: "order",
    });

    return order.toObject();
  }

  // ─── Customer selects a cleaner → ON_HOLD_PAYMENT ──────────────────────────

  async selectCleaner(
    orderId: string,
    customerId: string,
    cleanerId: string,
  ): Promise<{ order: Order; depositInfo: DepositInfo }> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if ((order as any).customerId.toString() !== customerId)
      throw new ForbiddenException("Access denied");

    // Idempotent: already waiting for deposit
    if (order.status === "ON_HOLD_PAYMENT") {
      const depositInfo = await this.depositService.getDepositInfo(orderId);
      if (depositInfo) return { order: order.toObject(), depositInfo };
    }

    if (order.status !== "PENDING") {
      throw new BadRequestException(
        `Order cannot accept cleaner selection in status ${order.status}`,
      );
    }

    const applicants: any[] = (order as any).applicants ?? [];
    const applicant = applicants.find(
      (a: any) =>
        a.cleanerId.toString() === cleanerId && a.status === "PENDING",
    );
    if (!applicant)
      throw new BadRequestException("Cleaner has not applied for this order");

    const depositDeadline = new Date(Date.now() + 30 * 60 * 1000);
    (order as any).pendingCleanerId = new Types.ObjectId(cleanerId);
    (order as any).depositDeadline = depositDeadline;
    order.status = "ON_HOLD_PAYMENT";
    applicant.status = "SELECTED";
    await order.save();

    const depositInfo = await this.depositService.createDepositPayment(
      orderId,
      customerId,
      depositDeadline,
    );

    await Promise.all([
      this.notificationsService.create({
        recipientId: cleanerId,
        type: NotificationType.PAYMENT_REQUIRED,
        title: "Khách đang đặt cọc",
        body: "Khách hàng đã chọn bạn. Đơn sẽ xác nhận sau khi họ đặt cọc 30.000 ₫ (trong 30 phút).",
        referenceId: orderId,
        referenceType: "order",
      }),
      this.notificationsService.create({
        recipientId: customerId,
        type: NotificationType.PAYMENT_REQUIRED,
        title: "Vui lòng đặt cọc để xác nhận đơn",
        body: "Đặt cọc 30.000 ₫ trong vòng 30 phút để giữ nhân viên cho đơn của bạn.",
        referenceId: orderId,
        referenceType: "order",
      }),
    ]);

    return { order: order.toObject(), depositInfo };
  }

  // ─── Called by SepayWebhookService after deposit confirmed ─────────────────

  async confirmAfterDeposit(orderId: string): Promise<void> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order || order.status !== "ON_HOLD_PAYMENT") return;

    const pendingCleanerId = (order as any).pendingCleanerId;
    if (!pendingCleanerId) return;

    order.cleanerId = pendingCleanerId;
    (order as any).pendingCleanerId = null;
    order.status = "CONFIRMED";
    (order as any).paymentStatus = "UNPAID"; // still awaiting final
    await order.save();

    // Reject remaining applicants
    const applicants: any[] = (order as any).applicants ?? [];
    for (const a of applicants) {
      if (a.status === "PENDING") {
        a.status = "REJECTED";
        await this.notificationsService.create({
          recipientId: a.cleanerId.toString(),
          type: NotificationType.JOB_NOT_SELECTED,
          title: "Đơn đã được nhận bởi nhân viên khác",
          body: "Khách hàng đã chọn nhân viên khác cho đơn này.",
          referenceId: orderId,
          referenceType: "order",
        });
      }
    }
    await order.save();

    await Promise.all([
      this.notificationsService.create({
        recipientId: pendingCleanerId.toString(),
        type: NotificationType.JOB_ASSIGNED,
        title: "Đặt cọc thành công — Bạn được xác nhận!",
        body: "Đặt cọc hoàn tất. Hãy chấp nhận công việc để bắt đầu.",
        referenceId: orderId,
        referenceType: "order",
      }),
      this.notificationsService.create({
        recipientId: order.customerId.toString(),
        type: NotificationType.PAYMENT_CONFIRMED,
        title: "Đặt cọc thành công!",
        body: "Nhân viên đã được xác nhận cho đơn của bạn.",
        referenceId: orderId,
        referenceType: "order",
      }),
    ]);
  }

  // ─── Called by SepayWebhookService after final payment confirmed ────────────

  async completeAfterFinalPayment(orderId: string): Promise<void> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order || order.status !== "PAYMENT_PENDING") return;

    order.status = "COMPLETED";
    (order as any).paymentStatus = "PAID";
    await order.save();

    await Promise.all([
      this.notificationsService.create({
        recipientId: order.customerId.toString(),
        type: NotificationType.FINAL_PAYMENT_CONFIRMED,
        title: "Thanh toán hoàn tất!",
        body: "Cảm ơn bạn đã sử dụng CareMate. Đơn hàng đã hoàn thành.",
        referenceId: orderId,
        referenceType: "order",
      }),
      order.cleanerId
        ? this.notificationsService.create({
            recipientId: order.cleanerId.toString(),
            type: NotificationType.FINAL_PAYMENT_CONFIRMED,
            title: "Thanh toán đã được xác nhận",
            body: "Thu nhập từ đơn này đã được ghi nhận.",
            referenceId: orderId,
            referenceType: "order",
          })
        : Promise.resolve(),
    ]);
  }

  // ─── Admin manual offline-payment overrides ────────────────────────────────

  async adminConfirmDeposit(orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "ON_HOLD_PAYMENT") {
      throw new BadRequestException(
        `Order must be ON_HOLD_PAYMENT to confirm deposit offline (current: ${order.status})`,
      );
    }

    const pendingCleanerId = (order as any).pendingCleanerId;
    if (!pendingCleanerId)
      throw new BadRequestException("No pending cleaner on this order");

    order.cleanerId = new Types.ObjectId(pendingCleanerId.toString());
    order.status = "CONFIRMED";
    (order as any).pendingCleanerId = null;

    const applicants: any[] = (order as any).applicants ?? [];
    applicants.forEach((a: any) => {
      if (a.cleanerId.toString() === pendingCleanerId.toString()) {
        a.status = "SELECTED";
      } else if (a.status === "PENDING") {
        a.status = "REJECTED";
      }
    });

    await order.save();

    await Promise.all([
      this.notificationsService.create({
        recipientId: pendingCleanerId.toString(),
        type: NotificationType.JOB_ASSIGNED,
        title: "Đặt cọc xác nhận (offline) — Bạn được xác nhận!",
        body: "Admin đã xác nhận đặt cọc. Hãy chấp nhận công việc để bắt đầu.",
        referenceId: orderId,
        referenceType: "order",
      }),
      this.notificationsService.create({
        recipientId: order.customerId.toString(),
        type: NotificationType.PAYMENT_CONFIRMED,
        title: "Đặt cọc đã được xác nhận!",
        body: "Admin đã xác nhận thanh toán đặt cọc. Nhân viên chính thức được gán.",
        referenceId: orderId,
        referenceType: "order",
      }),
    ]);

    return order.toObject();
  }

  async adminConfirmFinalPayment(orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "PAYMENT_PENDING") {
      throw new BadRequestException(
        `Order must be PAYMENT_PENDING to confirm final payment offline (current: ${order.status})`,
      );
    }

    order.status = "COMPLETED";
    (order as any).paymentStatus = "PAID";
    await order.save();

    await Promise.all([
      this.notificationsService.create({
        recipientId: order.customerId.toString(),
        type: NotificationType.FINAL_PAYMENT_CONFIRMED,
        title: "Thanh toán hoàn tất!",
        body: "Admin đã xác nhận thanh toán. Đơn hàng đã hoàn thành.",
        referenceId: orderId,
        referenceType: "order",
      }),
      order.cleanerId
        ? this.notificationsService.create({
            recipientId: order.cleanerId.toString(),
            type: NotificationType.FINAL_PAYMENT_CONFIRMED,
            title: "Thanh toán đã được xác nhận",
            body: "Admin xác nhận thu nhập từ đơn này đã được ghi nhận.",
            referenceId: orderId,
            referenceType: "order",
          })
        : Promise.resolve(),
    ]);

    return order.toObject();
  }

  // ─── Existing flow methods (updated for new statuses) ──────────────────────

  async assignCleaner(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "PENDING") {
      throw new BadRequestException(
        `Cannot assign cleaner to order in ${order.status} status`,
      );
    }

    order.cleanerId = new Types.ObjectId(cleanerId);
    order.status = "CONFIRMED";
    await order.save();

    await Promise.all([
      this.notificationsService.create({
        recipientId: order.customerId.toString(),
        type: NotificationType.CLEANER_ASSIGNED,
        title: "Nhân viên đã được phân công",
        body: "Một nhân viên đã được phân công cho đơn của bạn.",
        referenceId: orderId,
        referenceType: "order",
      }),
      this.notificationsService.create({
        recipientId: cleanerId,
        type: NotificationType.JOB_ASSIGNED,
        title: "Công việc mới được phân công",
        body: "Bạn được phân công một công việc mới.",
        referenceId: orderId,
        referenceType: "order",
      }),
    ]);

    return order.toObject();
  }

  async reassignCleaner(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (!["CONFIRMED", "ACCEPTED"].includes(order.status)) {
      throw new BadRequestException(
        `Cannot reassign cleaner when order is ${order.status}`,
      );
    }

    order.cleanerId = new Types.ObjectId(cleanerId);
    order.status = "CONFIRMED";
    return order.save();
  }

  async acceptJob(orderId: string, cleanerId: string): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== "CONFIRMED") {
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
    await order.save();

    await this.notificationsService.create({
      recipientId: order.customerId.toString(),
      type: NotificationType.CLEANER_CHECKED_IN,
      title: "Nhân viên đã đến!",
      body: "Nhân viên của bạn đã check-in và bắt đầu làm việc.",
      referenceId: orderId,
      referenceType: "order",
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
    if (order.status !== "IN_PROGRESS") {
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
      throw new ForbiddenException("Access denied");
    if (order.status !== "IN_PROGRESS")
      throw new BadRequestException("Order is not in progress");

    const allDone = order.tasks.every(
      (t) => t.isDone && t.photoBefore && t.photoAfter,
    );
    if (!allDone)
      throw new BadRequestException(
        "All tasks must be completed with before and after photos",
      );

    order.status = "REVIEW_PENDING";
    await order.save();

    await this.notificationsService.create({
      recipientId: order.customerId.toString(),
      type: NotificationType.ORDER_COMPLETED,
      title: "Dọn dẹp hoàn tất!",
      body: "Nhân viên đã hoàn thành. Hãy đánh giá và thanh toán phần còn lại.",
      referenceId: orderId,
      referenceType: "order",
    });

    return order.toObject();
  }

  async cancelOrder(
    orderId: string,
    cancelledBy: "customer" | "admin",
    reason?: string,
  ): Promise<Order> {
    const order = await this.orderModel.findById(new Types.ObjectId(orderId));
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const allowed =
      cancelledBy === "customer" ? CUSTOMER_CANCELLABLE : ADMIN_CANCELLABLE;
    if (!allowed.includes(order.status))
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}`,
      );

    // Refund deposit if it was already paid
    if (["ON_HOLD_PAYMENT", "CONFIRMED"].includes(order.status)) {
      await this.depositService.handleCancellationRefund(orderId, cancelledBy);
    }

    order.status = "CANCELLED";
    (order as any).cancelledBy = cancelledBy;
    (order as any).cancelledReason = reason ?? null;
    await order.save();

    const notifications: Promise<void>[] = [];
    if (order.customerId) {
      notifications.push(
        this.notificationsService.create({
          recipientId: order.customerId.toString(),
          type: NotificationType.ORDER_CANCELLED,
          title: "Đơn hàng đã bị huỷ",
          body: `Đơn của bạn đã bị huỷ. Lý do: ${reason ?? "N/A"}`,
          referenceId: orderId,
          referenceType: "order",
        }),
      );
    }
    if (order.cleanerId) {
      notifications.push(
        this.notificationsService.create({
          recipientId: order.cleanerId.toString(),
          type: NotificationType.ORDER_CANCELLED,
          title: "Công việc đã bị huỷ",
          body: "Một công việc được phân công đã bị huỷ.",
          referenceId: orderId,
          referenceType: "order",
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
      throw new ForbiddenException("Access denied");
    if (order.status !== "REVIEW_PENDING")
      throw new BadRequestException(
        "Review can only be submitted when order is awaiting review",
      );
    if (order.rating !== null && order.rating !== undefined)
      throw new ConflictException("Review already submitted");

    order.rating = reviewDto.rating;
    order.review = reviewDto.comment ?? null;
    // Move to PAYMENT_PENDING — final payment required
    order.status = "PAYMENT_PENDING";
    await order.save();

    // Create final payment record
    await this.finalPaymentService.createFinalPayment(
      orderId,
      customerId,
      order.totalAmount - DEPOSIT_AMOUNT,
    );

    const notifications: Promise<void>[] = [];

    if (order.cleanerId) {
      notifications.push(
        this.notificationsService.create({
          recipientId: order.cleanerId.toString(),
          type: NotificationType.NEW_REVIEW_RECEIVED,
          title: "Bạn có đánh giá mới",
          body: `Bạn nhận được đánh giá ${reviewDto.rating} sao.`,
          referenceId: orderId,
          referenceType: "order",
        }),
      );
    }

    notifications.push(
      this.notificationsService.create({
        recipientId: customerId,
        type: NotificationType.FINAL_PAYMENT_REQUIRED,
        title: "Vui lòng thanh toán phần còn lại",
        body: `Còn lại ${(order.totalAmount - DEPOSIT_AMOUNT).toLocaleString("vi-VN")} ₫. Hoàn tất để kết thúc đơn.`,
        referenceId: orderId,
        referenceType: "order",
      }),
    );

    if (reviewDto.rating <= 2) {
      const admins = await this.userModel.find({
        role: "admin",
        isActive: true,
      });
      for (const admin of admins) {
        notifications.push(
          this.notificationsService.create({
            recipientId: (admin as any)._id.toString(),
            type: NotificationType.LOW_RATING_ALERT,
            title: "Cảnh báo đánh giá thấp",
            body: `Đơn nhận ${reviewDto.rating} sao. Vui lòng kiểm tra.`,
            referenceId: orderId,
            referenceType: "order",
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
        status: { $in: ["CONFIRMED", "ACCEPTED", "IN_PROGRESS"] },
      })
      .lean();
  }

  async getCleanerAppliedOrders(cleanerId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        status: "PENDING",
        "applicants.cleanerId": new Types.ObjectId(cleanerId),
        "applicants.status": "PENDING",
      })
      .lean();
  }

  async getCleanerCompletedOrders(cleanerId: string): Promise<Order[]> {
    return this.orderModel
      .find({
        cleanerId: new Types.ObjectId(cleanerId),
        status: { $in: ["REVIEW_PENDING", "PAYMENT_PENDING", "COMPLETED"] },
      })
      .lean();
  }

  async getAvailableOrders(cleanerId?: string): Promise<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await this.orderModel
      .find({
        status: "PENDING",
        scheduledDate: { $gte: today },
      })
      .lean();

    if (!cleanerId) return orders;

    const available: Order[] = [];
    for (const order of orders) {
      const alreadyApplied = ((order as any).applicants ?? []).some(
        (a: any) => a.cleanerId.toString() === cleanerId,
      );
      if (alreadyApplied) continue;

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
        status: { $in: ["CONFIRMED", "ACCEPTED", "IN_PROGRESS"] },
      })
      .lean();
    return conflict || null;
  }

  async getDashboardStats(): Promise<any> {
    const stats = await this.orderModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result: any = {
      total: 0,
      PENDING: 0,
      ON_HOLD_PAYMENT: 0,
      CONFIRMED: 0,
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      REVIEW_PENDING: 0,
      PAYMENT_PENDING: 0,
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
