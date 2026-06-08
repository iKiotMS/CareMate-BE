import {
  Controller,
  Get,
  Post,
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
import { ComplaintsService } from './complaints.service';
import {
  CreateComplaintDto,
  UpdateComplaintStatusDto,
  ReplyComplaintDto,
} from './dtos/complaint.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  // ── Customer endpoints ────────────────────────────────────────────────────
  @Post('complaints')
  @Roles('customer')
  createComplaint(@Req() req: any, @Body() dto: CreateComplaintDto) {
    return this.complaintsService.createComplaint(req.user.sub, dto);
  }

  @Get('complaints')
  @Roles('customer')
  getMyComplaints(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.complaintsService.getMyComplaints(req.user.sub, +page, +limit);
  }

  @Get('complaints/:id')
  @Roles('customer')
  getMyComplaintById(@Req() req: any, @Param('id') id: string) {
    return this.complaintsService.getMyComplaintById(req.user.sub, id);
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────
  @Get('admin/complaints')
  @Roles('admin')
  getAllComplaints(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.complaintsService.getAllComplaints(+page, +limit, status, category);
  }

  @Get('admin/complaints/:id')
  @Roles('admin')
  getComplaintById(@Param('id') id: string) {
    return this.complaintsService.getComplaintById(id);
  }

  @Patch('admin/complaints/:id/status')
  @Roles('admin')
  updateComplaintStatus(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintStatusDto,
    @Req() req: any,
  ) {
    return this.complaintsService.updateComplaintStatus(id, dto, req.user.sub);
  }

  @Post('admin/complaints/:id/reply')
  @Roles('admin')
  replyToComplaint(
    @Param('id') id: string,
    @Body() dto: ReplyComplaintDto,
    @Req() req: any,
  ) {
    return this.complaintsService.replyToComplaint(req.user.sub, id, dto);
  }
}
