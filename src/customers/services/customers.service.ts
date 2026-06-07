import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from '../../orders/services/orders.service';
import { CreateOrderDto, SubmitReviewDto } from '../../orders/dtos/order.dto';

@Injectable()
export class CustomersService {
  constructor(private ordersService: OrdersService) {}

  async createOrder(
    customerId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<any> {
    return this.ordersService.createOrder(customerId, createOrderDto);
  }

  async getCustomerOrders(customerId: string, status?: string): Promise<any> {
    return this.ordersService.getCustomerOrders(customerId, status);
  }

  async getOrderDetail(customerId: string, orderId: string): Promise<any> {
    const order = await this.ordersService.getOrderById(orderId);
    if (order.customerId.toString() !== customerId) {
      throw new BadRequestException('This order does not belong to you');
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
      throw new BadRequestException('This order does not belong to you');
    }
    return this.ordersService.cancelOrder(orderId, 'customer', reason);
  }

  async submitReview(
    customerId: string,
    orderId: string,
    reviewDto: SubmitReviewDto,
  ): Promise<any> {
    return this.ordersService.submitReview(orderId, customerId, reviewDto);
  }

  async getCustomerDashboard(customerId: string): Promise<any> {
    const orders = await this.ordersService.getCustomerOrders(customerId);
    const total = orders.length;
    const pending = orders.filter((o: any) => o.status === 'PENDING').length;
    const completed = orders.filter((o: any) => o.status === 'COMPLETED').length;
    const inProgress = orders.filter((o: any) =>
      ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(o.status),
    ).length;
    const recentOrders = [...orders]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalOrders: total,
      pendingOrders: pending,
      completedOrders: completed,
      inProgressOrders: inProgress,
      recentOrders,
    };
  }
}
