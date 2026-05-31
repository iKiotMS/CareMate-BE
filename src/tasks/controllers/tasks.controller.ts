import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { TasksService } from "../services/tasks.service";
import { CreateTaskDto, UpdateTaskDto } from "../dtos/task.dto";

@Controller("tasks")
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  async getAllTasks(@Query("activeOnly") activeOnly?: string) {
    return this.tasksService.getAllTasks(activeOnly === "true");
  }

  @Get(":id")
  async getTaskById(@Param("id") id: string) {
    return this.tasksService.getTaskById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.createTask(createTaskDto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  async updateTask(
    @Param("id") id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(id, updateTaskDto);
  }

  @Patch(":id/toggle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  async toggleTaskActive(@Param("id") id: string) {
    return this.tasksService.toggleTaskActive(id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  async deleteTask(@Param("id") id: string) {
    await this.tasksService.deleteTask(id);
    return { success: true };
  }
}
