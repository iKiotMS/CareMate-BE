import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SeederService } from "./seeder.service";
import {
  TaskCatalog,
  TaskCatalogSchema,
} from "../tasks/schemas/task-catalog.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaskCatalog.name, schema: TaskCatalogSchema },
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
