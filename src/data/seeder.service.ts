import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcryptjs";
import {
  TaskCatalog,
  TaskCatalogDocument,
} from "../tasks/schemas/task-catalog.schema";
import { User, UserDocument } from "../users/schemas/user.schema";
import { Order, OrderDocument } from "../orders/schemas/order.schema";
import { SAMPLE_TASKS } from "./sample-tasks";
import { SAMPLE_DATA } from "./sample-data";

// Maps sample-data string IDs → email/slug lookups
const CUST_ID_TO_EMAIL: Record<string, string> = {
  cust_001: "customer1@example.com",
  cust_002: "customer2@example.com",
  cust_003: "alice.johnson@example.com",
};
const CLEANER_ID_TO_EMAIL: Record<string, string> = {
  clean_001: "cleaner1@example.com",
  clean_002: "cleaner2@example.com",
  clean_003: "cleaner3@example.com",
};
const TASK_ID_TO_SLUG: Record<string, string> = {
  task_001: "sweep",
  task_002: "mop",
  task_003: "vacuum",
  task_004: "wipe_furniture",
  task_005: "wipe_glass",
  task_006: "clean_toilet",
  task_007: "take_out_trash",
  task_008: "wash_dishes",
  task_009: "fold_clothes",
  task_010: "organize",
};

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(TaskCatalog.name)
    private taskCatalogModel: Model<TaskCatalogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async onApplicationBootstrap() {
    const taskSlugMap = await this.seedTasks();
    const userEmailMap = await this.seedUsers();
    await this.seedOrders(userEmailMap, taskSlugMap);
  }

  private async seedTasks(): Promise<Map<string, Types.ObjectId>> {
    const slugToId = new Map<string, Types.ObjectId>();

    const existing = await this.taskCatalogModel.find().lean();
    if (existing.length > 0) {
      console.log(`✅ TaskCatalog already has ${existing.length} tasks, skipping seed`);
      for (const t of existing) {
        slugToId.set(t.slug, t._id as Types.ObjectId);
      }
      return slugToId;
    }

    console.log("🌱 Seeding TaskCatalog...");
    const now = new Date();
    const inserted = await this.taskCatalogModel.insertMany(
      SAMPLE_TASKS.map((t) => ({ ...t, createdAt: now, updatedAt: now })),
    );
    for (const t of inserted) {
      slugToId.set(t.slug, t._id as Types.ObjectId);
    }
    console.log(`✅ Seeded ${inserted.length} tasks`);
    return slugToId;
  }

  private async seedUsers(): Promise<Map<string, Types.ObjectId>> {
    const emailToId = new Map<string, Types.ObjectId>();

    const existing = await this.userModel.find().lean();
    if (existing.length > 0) {
      console.log(`✅ Users already has ${existing.length} records, skipping seed`);
      for (const u of existing) {
        emailToId.set(u.email, u._id as Types.ObjectId);
      }
      return emailToId;
    }

    console.log("🌱 Seeding Users...");
    const passwordHash = await bcrypt.hash("password123", 10);

    const allUsers = [
      ...SAMPLE_DATA.customers,
      ...SAMPLE_DATA.cleaners,
      ...SAMPLE_DATA.admin,
    ].map((u) => ({
      email: u.email,
      passwordHash,
      role: u.role,
      fullName: u.fullName,
      phone: u.phone,
      avatarUrl: null,
      isActive: u.isActive,
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(),
    }));

    const inserted = await this.userModel.insertMany(allUsers);
    for (const u of inserted) {
      emailToId.set(u.email, u._id as Types.ObjectId);
    }
    console.log(`✅ Seeded ${inserted.length} users`);
    return emailToId;
  }

  private async seedOrders(
    userEmailMap: Map<string, Types.ObjectId>,
    taskSlugMap: Map<string, Types.ObjectId>,
  ): Promise<void> {
    const count = await this.orderModel.countDocuments();
    if (count > 0) {
      console.log(`✅ Orders already has ${count} records, skipping seed`);
      return;
    }

    // Build slug→price lookup from SAMPLE_TASKS
    const slugToPrice: Record<string, number> = {};
    for (const t of SAMPLE_TASKS) {
      slugToPrice[t.slug] = (t as any).price ?? 0;
    }

    console.log("🌱 Seeding Orders...");

    const ordersToInsert = SAMPLE_DATA.orders.map((o) => {
      const custEmail = CUST_ID_TO_EMAIL[o.customerId];
      const cleanerEmail = CLEANER_ID_TO_EMAIL[o.cleanerId ?? ""];

      const tasks = o.tasks.map((t) => {
        const slug = TASK_ID_TO_SLUG[t.taskId];
        const price = slugToPrice[slug] ?? 0;
        const catalogId = taskSlugMap.get(slug) ?? new Types.ObjectId();
        return {
          taskCatalogId: catalogId,
          taskName: t.taskName,
          taskPrice: price,
          isDone: t.isDone,
          completedAt: null,
          photoBefore: null,
          photoAfter: null,
        };
      });

      const totalAmount = tasks.reduce((sum, t) => sum + t.taskPrice, 0);

      return {
        customerId: userEmailMap.get(custEmail) ?? new Types.ObjectId(),
        cleanerId: cleanerEmail ? (userEmailMap.get(cleanerEmail) ?? null) : null,
        status: o.status,
        scheduledDate: new Date(o.scheduledDate),
        scheduledTime: o.scheduledTime,
        address: o.address,
        note: o.note ?? null,
        tasks,
        photosBeforeBooking: o.photosBeforeBooking,
        photosCheckin: o.photosCheckin,
        photosAfter: o.photosAfter,
        totalAmount,
        paymentMethod: "CASH",
        paymentStatus: o.status === "COMPLETED" ? "PAID" : "UNPAID",
        transactionRef: null,
        paymentNote: null,
        rating: o.rating ?? null,
        review: o.review ?? null,
        cancelledBy: o.cancelledBy ?? null,
        cancelledReason: o.cancelledReason ?? null,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(),
      };
    });

    await this.orderModel.insertMany(ordersToInsert);
    console.log(`✅ Seeded ${ordersToInsert.length} orders`);
  }
}
