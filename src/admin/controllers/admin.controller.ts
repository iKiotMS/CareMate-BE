import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdminService } from "../services/admin.service";
import {
  CreateCleanerDto,
  UpdateCleanerDto,
  AssignCleanerDto,
  CancelOrderDto,
} from "../dtos/admin.dto";
import { CreateTaskDto, UpdateTaskDto } from "../../tasks/dtos/task.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private adminService: AdminService) {}

  // DASHBOARD
  @Get("dashboard/stats")
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // CUSTOMERS
  @Get("customers")
  async listCustomers(
    @Query("search") search?: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.adminService.listCustomers(search, page, limit);
  }

  @Get("customers/:id")
  async getCustomerDetail(@Param("id") id: string) {
    return this.adminService.getCustomerDetail(id);
  }

  @Patch("customers/:id/lock")
  async lockCustomer(@Param("id") id: string) {
    return this.adminService.lockUnlockCustomer(id, true);
  }

  @Patch("customers/:id/unlock")
  async unlockCustomer(@Param("id") id: string) {
    return this.adminService.lockUnlockCustomer(id, false);
  }

  // CLEANERS
  @Get("cleaners")
  async listCleaners(
    @Query("search") search?: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.adminService.listCleaners(search, page, limit);
  }

  @Get("cleaners/:id")
  async getCleanerDetail(@Param("id") id: string) {
    return this.adminService.getCleanerDetail(id);
  }

  @Post("cleaners")
  async createCleaner(@Body() createCleanerDto: CreateCleanerDto) {
    return this.adminService.createCleaner(createCleanerDto);
  }

  @Patch("cleaners/:id")
  async updateCleaner(
    @Param("id") id: string,
    @Body() updateCleanerDto: UpdateCleanerDto,
  ) {
    return this.adminService.updateCleaner(id, updateCleanerDto);
  }

  @Patch("cleaners/:id/lock")
  async lockCleaner(@Param("id") id: string) {
    return this.adminService.lockUnlockCleaner(id, true);
  }

  @Patch("cleaners/:id/unlock")
  async unlockCleaner(@Param("id") id: string) {
    return this.adminService.lockUnlockCleaner(id, false);
  }

  // ORDERS
  @Get("orders")
  async listOrders(
    @Query("status") status?: string,
    @Query("cleanerId") cleanerId?: string,
    @Query("customerId") customerId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
  ) {
    const filters = { status, cleanerId, customerId, startDate, endDate };
    return this.adminService.listOrders(filters, page, limit);
  }

  @Patch("orders/:id/assign-cleaner")
  async assignCleaner(
    @Param("id") id: string,
    @Body() assignCleanerDto: AssignCleanerDto,
  ) {
    return this.adminService.assignCleanerToOrder(
      id,
      assignCleanerDto.cleanerId,
    );
  }

  @Patch("orders/:id/reassign-cleaner")
  async reassignCleaner(
    @Param("id") id: string,
    @Body() assignCleanerDto: AssignCleanerDto,
  ) {
    return this.adminService.reassignCleanerToOrder(
      id,
      assignCleanerDto.cleanerId,
    );
  }

  @Patch("orders/:id/cancel")
  async cancelOrder(
    @Param("id") id: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    return this.adminService.cancelOrder(id, cancelOrderDto.reason);
  }

  // TASKS
  @Get("tasks")
  async listTasks() {
    return this.adminService.listTasks();
  }

  @Post("tasks")
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    return this.adminService.createTask(createTaskDto);
  }

  @Patch("tasks/:id")
  async updateTask(
    @Param("id") id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.adminService.updateTask(id, updateTaskDto);
  }

  @Patch("tasks/:id/toggle")
  async toggleTaskActive(@Param("id") id: string) {
    return this.adminService.toggleTaskActive(id);
  }
}
