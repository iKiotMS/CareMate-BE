import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AvailabilityService } from './availability.service';
import { UpdateAvailabilityDto } from './dtos/availability.dto';

@Controller('cleaner/availability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('cleaner')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  getMyAvailability(@Req() req: any) {
    return this.availabilityService.getMyAvailability(req.user.sub);
  }

  @Put()
  updateMyAvailability(@Req() req: any, @Body() dto: UpdateAvailabilityDto) {
    return this.availabilityService.updateMyAvailability(req.user.sub, dto);
  }
}
