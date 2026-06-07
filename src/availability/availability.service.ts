import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Availability, AvailabilityDocument } from './schemas/availability.schema';
import { UpdateAvailabilityDto } from './dtos/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name)
    private readonly availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async getMyAvailability(cleanerId: string) {
    const availability = await this.availabilityModel
      .findOne({ cleanerId: new Types.ObjectId(cleanerId) })
      .lean();
    if (!availability) {
      return {
        cleanerId,
        workingDays: [1, 2, 3, 4, 5],
        workingHours: { start: '08:00', end: '18:00' },
        daysOff: [],
      };
    }
    return availability;
  }

  async updateMyAvailability(cleanerId: string, dto: UpdateAvailabilityDto) {
    const update: Record<string, unknown> = {};
    if (dto.workingDays !== undefined) update['workingDays'] = dto.workingDays;
    if (dto.workingHours !== undefined) update['workingHours'] = dto.workingHours;
    if (dto.daysOff !== undefined) update['daysOff'] = dto.daysOff;

    return this.availabilityModel.findOneAndUpdate(
      { cleanerId: new Types.ObjectId(cleanerId) },
      { $set: update },
      { upsert: true, new: true },
    );
  }
}
