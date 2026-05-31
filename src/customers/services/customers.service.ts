import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { OrdersService } from "../../orders/services/orders.service";
import { CreateOrderDto, SubmitReviewDto } from "../../orders/dtos/order.dto";
import { TasksService } from "../../tasks/services/tasks.service";

@Injectable()
export class CustomersService {
  constructor(
    private ordersService: OrdersService,
    private tasksService: TasksService,
  ) {}

  async createOrder(
    customerId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<any> {
    const tasks = await this.tasksService.getTasksByIds(createOrderDto.taskIds);
    if (tasks.length !== createOrderDto.taskIds.length) {
      throw new BadRequestException("One or more tasks do not exist");
    }

    const taskMap = Object.fromEntries(
      (tasks as any[]).map((task) => [task._id.toString(), task.name]),
    );

    return this.ordersService.createOrder(customerId, createOrderDto, taskMap);
  }

  async getCustomerOrders(customerId: string, status?: string): Promise<any> {
    return this.ordersService.getCustomerOrders(customerId, status);
  }

  async getOrderDetail(customerId: string, orderId: string): Promise<any> {
    const order = await this.ordersService.getOrderById(orderId);
    if (order.customerId.toString() !== customerId) {
      throw new BadRequestException("This order does not belong to you");
    }
    return order;
  }

  async cancelOrder(
    customerId: string,
    orderId: string,
    reason?: string,
  ): Promise<any> {
    const order = await this.ordersService.getOrderById(orderId);
    if (order.customerId.toString() !== customerId) {
      throw new BadRequestException("This order does not belong to you");
    }
    return this.ordersService.cancelOrder(orderId, "customer", reason);
  }

  async submitReview(
    customerId: string,
    orderId: string,
    reviewDto: SubmitReviewDto,
  ): Promise<any> {
    const order = await this.ordersService.getOrderById(orderId);
    if (order.customerId.toString() !== customerId) {
      throw new BadRequestException("This order does not belong to you");
    }
    return this.ordersService.submitReview(orderId, customerId, reviewDto);
  }
}
