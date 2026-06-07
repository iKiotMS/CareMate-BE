import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CleanersService } from "../services/cleaners.service";

@Controller("cleaner")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("cleaner")
export class CleanersController {
  constructor(private cleanersService: CleanersService) {}

  @Get("dashboard")
  getCleanerDashboard(@Req() req: any) {
    return this.cleanersService.getCleanerDashboard(req.user.sub);
  }

  @Get("available-orders")
  async getAvailableOrders(@Req() req: any) {
    return this.cleanersService.getAvailableOrders(req.user.sub);
  }

  @Post("available-orders/:orderId/apply")
  async applyForOrder(@Param("orderId") orderId: string, @Req() req: any) {
    return this.cleanersService.applyForOrder(req.user.sub, orderId);
  }

  @Get("jobs")
  async getAssignedJobs(@Req() req: any) {
    return this.cleanersService.getAssignedJobs(req.user.sub);
  }

  @Get("jobs/:jobId")
  async getJobDetail(@Param("jobId") jobId: string, @Req() req: any) {
    return this.cleanersService.getJobDetail(req.user.sub, jobId);
  }

  @Patch("jobs/:jobId/accept")
  async acceptJob(@Param("jobId") jobId: string, @Req() req: any) {
    return this.cleanersService.acceptJob(req.user.sub, jobId);
  }

  @Patch("jobs/:jobId/check-in")
  async checkInJob(
    @Param("jobId") jobId: string,
    @Body() body: { photosCheckin: string[] },
    @Req() req: any,
  ) {
    return this.cleanersService.checkInJob(
      req.user.sub,
      jobId,
      body.photosCheckin,
    );
  }

  @Patch("jobs/:jobId/mark-task-done")
  async markTaskDone(
    @Param("jobId") jobId: string,
    @Body()
    body: { taskCatalogId: string; photoBefore?: string; photoAfter?: string },
    @Req() req: any,
  ) {
    return this.cleanersService.markTaskDone(
      req.user.sub,
      jobId,
      body.taskCatalogId,
      body.photoBefore,
      body.photoAfter,
    );
  }

  @Patch("jobs/:jobId/complete")
  async completeJob(@Param("jobId") jobId: string, @Req() req: any) {
    return this.cleanersService.completeJob(req.user.sub, jobId);
  }

  @Get("work-history")
  async getWorkHistory(@Req() req: any) {
    return this.cleanersService.getWorkHistory(req.user.sub);
  }
}
