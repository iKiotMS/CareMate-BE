import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TaskCatalog, TaskCatalogSchema } from "./schemas/task-catalog.schema";
import { TasksService } from "./services/tasks.service";
import { TasksController } from "./controllers/tasks.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TaskCatalog.name, schema: TaskCatalogSchema }]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
