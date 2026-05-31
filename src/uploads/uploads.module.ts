import { Module } from "@nestjs/common";
import { UploadsController } from "./controllers/uploads.controller";

@Module({
  controllers: [UploadsController],
  providers: [],
  exports: [],
})
export class UploadsModule {}
