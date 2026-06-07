import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RevenueService } from './revenue.service';

@Controller('admin/revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('dashboard')
  getRevenueDashboard() {
    return this.revenueService.getRevenueDashboard();
  }

  @Get('by-period')
  getRevenueByPeriod(@Query('from') from?: string, @Query('to') to?: string) {
    return this.revenueService.getRevenueByPeriod(from, to);
  }

  @Get('order-stats')
  getOrderStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.revenueService.getOrderStats(from, to);
  }
}
