import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import { UpdatePaymentStatusDto, PaymentQueryDto } from './dtos/payment.dto';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  getAllTransactions(@Query() query: PaymentQueryDto) {
    return this.paymentsService.getAllTransactions(query);
  }

  @Get('stats')
  getPaymentStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.paymentsService.getPaymentStats(from, to);
  }

  @Patch(':orderId/status')
  updatePaymentStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdatePaymentStatusDto,
    @Req() req: any,
  ) {
    return this.paymentsService.updatePaymentStatus(orderId, dto, req.user.sub);
  }
}
