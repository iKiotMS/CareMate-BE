import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { UploadsController } from "./controllers/uploads.controller";
import { v2 as cloudinary } from "cloudinary";

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [
    {
      provide: "CLOUDINARY_CONFIG",
      useFactory: (configService: ConfigService) => {
        cloudinary.config({
          cloud_name: configService.get("CLOUDINARY_CLOUD_NAME"),
          api_key: configService.get("CLOUDINARY_API_KEY"),
          api_secret: configService.get("CLOUDINARY_API_SECRET"),
        });
        return cloudinary;
      },
      inject: [ConfigService],
    },
  ],
  exports: [],
})
export class UploadsModule {}
