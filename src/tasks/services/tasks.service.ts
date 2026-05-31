import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  TaskCatalog,
  TaskCatalogDocument,
} from "../schemas/task-catalog.schema";
import { CreateTaskDto, UpdateTaskDto } from "../dtos/task.dto";

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(TaskCatalog.name)
    private taskCatalogModel: Model<TaskCatalogDocument>,
  ) {}

  async getAllTasks(activeOnly: boolean = false): Promise<TaskCatalog[]> {
    const query = activeOnly ? { isActive: true } : {};
    return this.taskCatalogModel.find(query).sort({ sortOrder: 1 }).lean();
  }

  async getTaskById(taskId: string): Promise<TaskCatalog> {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException(`Invalid task id: ${taskId}`);
    }
    const task = await this.taskCatalogModel
      .findById(new Types.ObjectId(taskId))
      .lean();
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    return task;
  }

  async getTasksByIds(taskIds: string[]): Promise<TaskCatalog[]> {
    const invalidTaskId = taskIds.find((id) => !Types.ObjectId.isValid(id));
    if (invalidTaskId) {
      throw new BadRequestException(`Invalid task id: ${invalidTaskId}`);
    }
    return this.taskCatalogModel
      .find({ _id: { $in: taskIds.map((id) => new Types.ObjectId(id)) } })
      .lean();
  }

  async createTask(createTaskDto: CreateTaskDto): Promise<TaskCatalog> {
    const existingTask = await this.taskCatalogModel.findOne({
      slug: createTaskDto.slug,
    });
    if (existingTask) {
      throw new ConflictException(
        `Task with slug '${createTaskDto.slug}' already exists`,
      );
    }

    const task = new this.taskCatalogModel({
      name: createTaskDto.name,
      slug: createTaskDto.slug,
      isActive: true,
      sortOrder: createTaskDto.sortOrder || 0,
    });

    return task.save();
  }

  async updateTask(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskCatalog> {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException(`Invalid task id: ${taskId}`);
    }
    const task = await this.taskCatalogModel.findById(
      new Types.ObjectId(taskId),
    );
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (updateTaskDto.name !== undefined) task.name = updateTaskDto.name;
    if (updateTaskDto.isActive !== undefined)
      task.isActive = updateTaskDto.isActive;
    if (updateTaskDto.sortOrder !== undefined)
      task.sortOrder = updateTaskDto.sortOrder;

    return task.save();
  }

  async deleteTask(taskId: string): Promise<void> {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException(`Invalid task id: ${taskId}`);
    }
    const result = await this.taskCatalogModel.deleteOne({
      _id: new Types.ObjectId(taskId),
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
  }

  async toggleTaskActive(taskId: string): Promise<TaskCatalog> {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException(`Invalid task id: ${taskId}`);
    }
    const task = await this.taskCatalogModel.findById(
      new Types.ObjectId(taskId),
    );
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    task.isActive = !task.isActive;
    return task.save();
  }
}
