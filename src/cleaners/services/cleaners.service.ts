import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { OrdersService } from "../../orders/services/orders.service";

@Injectable()
export class CleanersService {
  constructor(private ordersService: OrdersService) {}

  async getAssignedJobs(cleanerId: string): Promise<any> {
    return this.ordersService.getCleanerAssignedJobs(cleanerId);
  }

  async getJobDetail(cleanerId: string, jobId: string): Promise<any> {
    const order = await this.ordersService.getOrderById(jobId);
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException("This job is not assigned to you");
    }
    return order;
  }

  async acceptJob(cleanerId: string, jobId: string): Promise<any> {
    const order = await this.ordersService.getOrderById(jobId);
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException("This job is not assigned to you");
    }
    return this.ordersService.acceptJob(jobId, cleanerId);
  }

  async checkInJob(
    cleanerId: string,
    jobId: string,
    photosCheckin: string[],
  ): Promise<any> {
    const order = await this.ordersService.getOrderById(jobId);
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException("This job is not assigned to you");
    }
    return this.ordersService.checkIn(jobId, cleanerId, photosCheckin);
  }

  async markTaskDone(
    cleanerId: string,
    jobId: string,
    taskCatalogId: string,
    photoBefore?: string,
    photoAfter?: string,
  ): Promise<any> {
    const order = await this.ordersService.getOrderById(jobId);
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException("This job is not assigned to you");
    }
    return this.ordersService.markTaskDone(
      jobId,
      taskCatalogId,
      photoBefore,
      photoAfter,
    );
  }

  async completeJob(cleanerId: string, jobId: string): Promise<any> {
    const order = await this.ordersService.getOrderById(jobId);
    if (order.cleanerId?.toString() !== cleanerId) {
      throw new BadRequestException("This job is not assigned to you");
    }
    return this.ordersService.completeOrder(jobId, cleanerId);
  }

  async getWorkHistory(cleanerId: string): Promise<any> {
    return this.ordersService.getCleanerCompletedOrders(cleanerId);
  }

  async getAvailableOrders(cleanerId: string): Promise<any> {
    return this.ordersService.getAvailableOrders(cleanerId);
  }

  async applyForOrder(cleanerId: string, orderId: string): Promise<any> {
    return this.ordersService.applyForOrder(orderId, cleanerId);
  }
}
