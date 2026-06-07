import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { OrdersService } from "../services/orders.service";
import {
  CreateOrderDto,
  AssignCleanerDto,
  SubmitReviewDto,
  CancelOrderDto,
  MarkTaskDoneDto,
} from "../dtos/order.dto";

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @Roles("admin")
  async getAllOrders(@Query() filters?: any) {
    return this.ordersService.getAllOrders(filters);
  }

  @Get("stats")
  @Roles("admin")
  async getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }

  @Get(":id")
  async getOrderById(@Param("id") id: string, @Req() req: any) {
    const order = await this.ordersService.getOrderById(id);

    // Validate access: customer can only see their own orders, admin can see all
    if (
      req.user.role === "customer" &&
      order.customerId.toString() !== req.user.sub
    ) {
      throw new Error("Access denied");
    }
    if (
      req.user.role === "cleaner" &&
      order.cleanerId?.toString() !== req.user.sub
    ) {
      throw new Error("Access denied");
    }

    return order;
  }

  @Post()
  @Roles("customer")
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.createOrder(req.user.sub, createOrderDto);
  }

  @Patch(":id/assign-cleaner")
  @Roles("admin")
  async assignCleaner(
    @Param("id") orderId: string,
    @Body() assignCleanerDto: AssignCleanerDto,
  ) {
    return this.ordersService.assignCleaner(
      orderId,
      assignCleanerDto.cleanerId,
    );
  }

  @Patch(":id/reassign-cleaner")
  @Roles("admin")
  async reassignCleaner(
    @Param("id") orderId: string,
    @Body() assignCleanerDto: AssignCleanerDto,
  ) {
    return this.ordersService.reassignCleaner(
      orderId,
      assignCleanerDto.cleanerId,
    );
  }

  @Patch(":id/accept")
  @Roles("cleaner")
  async acceptJob(@Param("id") orderId: string, @Req() req: any) {
    return this.ordersService.acceptJob(orderId, req.user.sub);
  }

  @Patch(":id/check-in")
  @Roles("cleaner")
  async checkIn(
    @Param("id") orderId: string,
    @Body() body: { photosCheckin: string[] },
    @Req() req: any,
  ) {
    return this.ordersService.checkIn(
      orderId,
      req.user.sub,
      body.photosCheckin,
    );
  }

  @Patch(":id/mark-task-done")
  @Roles("cleaner")
  async markTaskDone(
    @Param("id") orderId: string,
    @Body()
    body: { taskCatalogId: string; photoBefore?: string; photoAfter?: string },
    @Req() req: any,
  ) {
    const order = await this.ordersService.getOrderById(orderId);
    if (order.cleanerId?.toString() !== req.user.sub) {
      throw new Error("Access denied");
    }
    return this.ordersService.markTaskDone(
      orderId,
      body.taskCatalogId,
      body.photoBefore,
      body.photoAfter,
    );
  }

  @Patch(":id/complete")
  @Roles("cleaner")
  async completeOrder(@Param("id") orderId: string, @Req() req: any) {
    return this.ordersService.completeOrder(orderId, req.user.sub);
  }

  @Patch(":id/cancel")
  @Roles("customer", "admin")
  async cancelOrder(
    @Param("id") orderId: string,
    @Body() cancelOrderDto: CancelOrderDto,
    @Req() req: any,
  ) {
    const cancelledBy = req.user.role === "customer" ? "customer" : "admin";
    return this.ordersService.cancelOrder(
      orderId,
      cancelledBy,
      cancelOrderDto.reason,
    );
  }

  @Patch(":id/review")
  @Roles("customer")
  async submitReview(
    @Param("id") orderId: string,
    @Body() reviewDto: SubmitReviewDto,
    @Req() req: any,
  ) {
    return this.ordersService.submitReview(orderId, req.user.sub, reviewDto);
  }

  @Get(":id/applicants")
  @Roles("customer", "admin")
  async getApplicants(@Param("id") orderId: string, @Req() req: any) {
    return this.ordersService.getOrderApplicants(orderId, req.user.sub, req.user.role);
  }

  @Post(":id/select-cleaner")
  @Roles("customer")
  async selectCleaner(
    @Param("id") orderId: string,
    @Body("cleanerId") cleanerId: string,
    @Req() req: any,
  ) {
    return this.ordersService.selectCleaner(orderId, req.user.sub, cleanerId);
  }

  @Patch(":id/admin-confirm-deposit")
  @Roles("admin")
  async adminConfirmDeposit(@Param("id") orderId: string) {
    return this.ordersService.adminConfirmDeposit(orderId);
  }

  @Patch(":id/admin-confirm-final-payment")
  @Roles("admin")
  async adminConfirmFinalPayment(@Param("id") orderId: string) {
    return this.ordersService.adminConfirmFinalPayment(orderId);
  }
}
