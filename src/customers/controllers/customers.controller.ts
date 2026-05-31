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
import { CustomersService } from "../services/customers.service";
import {
  CreateOrderDto,
  SubmitReviewDto,
  CancelOrderDto,
} from "../../orders/dtos/order.dto";

@Controller("customers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post("orders")
  @Roles("customer")
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.customersService.createOrder(req.user.sub, createOrderDto);
  }

  @Get("orders")
  @Roles("customer")
  async getOrders(@Req() req: any, @Query("status") status?: string) {
    return this.customersService.getCustomerOrders(req.user.sub, status);
  }

  @Get("orders/:orderId")
  @Roles("customer")
  async getOrderDetail(@Param("orderId") orderId: string, @Req() req: any) {
    return this.customersService.getOrderDetail(req.user.sub, orderId);
  }

  @Patch("orders/:orderId/cancel")
  @Roles("customer")
  async cancelOrder(
    @Param("orderId") orderId: string,
    @Body() cancelOrderDto: CancelOrderDto,
    @Req() req: any,
  ) {
    return this.customersService.cancelOrder(
      req.user.sub,
      orderId,
      cancelOrderDto.reason,
    );
  }

  @Patch("orders/:orderId/review")
  @Roles("customer")
  async submitReview(
    @Param("orderId") orderId: string,
    @Body() reviewDto: SubmitReviewDto,
    @Req() req: any,
  ) {
    return this.customersService.submitReview(req.user.sub, orderId, reviewDto);
  }
}
