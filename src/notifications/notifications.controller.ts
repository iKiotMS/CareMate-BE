import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { MarkNotificationsReadDto } from './dtos/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer', 'cleaner', 'admin')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getMyNotifications(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.notificationsService.getMyNotifications(req.user.sub, +page, +limit);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.sub);
  }

  @Patch('read')
  markAsRead(@Req() req: any, @Body() dto: MarkNotificationsReadDto) {
    return this.notificationsService.markAsRead(req.user.sub, dto.ids);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }
}
