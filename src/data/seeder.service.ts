import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  TaskCatalog,
  TaskCatalogDocument,
} from "../tasks/schemas/task-catalog.schema";
import { SAMPLE_TASKS } from "./sample-tasks";

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(TaskCatalog.name)
    private taskCatalogModel: Model<TaskCatalogDocument>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedTasks();
  }

  async seedTasks(): Promise<void> {
    try {
      // Check if tasks already exist
      const count = await this.taskCatalogModel.countDocuments();

      if (count === 0) {
        console.log("🌱 Seeding TaskCatalog...");
        const tasksToInsert = SAMPLE_TASKS.map((task) => ({
          ...task,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await this.taskCatalogModel.insertMany(tasksToInsert);
        console.log(`✅ Successfully seeded ${tasksToInsert.length} tasks`);
      } else {
        console.log(`✅ TaskCatalog already has ${count} tasks, skipping seed`);
      }
    } catch (error) {
      console.error("❌ Error seeding tasks:", error);
    }
  }
}
