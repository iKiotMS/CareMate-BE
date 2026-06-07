import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IncomeService } from './income.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Get('income/summary')
  @Roles('cleaner')
  getMyIncomeSummary(
    @Req() req: any,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'all' = 'monthly',
  ) {
    return this.incomeService.getMyIncomeSummary(req.user.sub, period);
  }

  @Get('income/by-order')
  @Roles('cleaner')
  getMyIncomeByOrder(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.incomeService.getMyIncomeByOrder(req.user.sub, {
      from,
      to,
      page: +page,
      limit: +limit,
    });
  }

  @Get('admin/income/salary-stats')
  @Roles('admin')
  getAllCleanersSalaryStats(
    @Query('period') period: 'weekly' | 'monthly' = 'monthly',
  ) {
    return this.incomeService.getAllCleanersSalaryStats(period);
  }

  @Get('admin/income/commission')
  @Roles('admin')
  getSystemCommissionTotal(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.incomeService.getSystemCommissionTotal(from, to);
  }
}
