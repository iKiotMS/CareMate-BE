import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('cleaner/analytics/ratings')
  @Roles('cleaner')
  getMyRatingAnalytics(@Req() req: any) {
    return this.analyticsService.getMyRatingAnalytics(req.user.sub);
  }

  @Get('cleaner/analytics/reviews')
  @Roles('cleaner')
  getMyReceivedReviews(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.analyticsService.getMyReceivedReviews(req.user.sub, +page, +limit);
  }

  @Get('admin/analytics/ratings')
  @Roles('admin')
  getRatingAnalytics() {
    return this.analyticsService.getRatingAnalytics();
  }

  @Get('admin/analytics/cleaners')
  @Roles('admin')
  getAllCleanerPerformance(
    @Query('sortBy') sortBy: 'rating' | 'completionRate' | 'totalOrders' = 'rating',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.analyticsService.getAllCleanerPerformance(sortBy, +page, +limit);
  }
}
