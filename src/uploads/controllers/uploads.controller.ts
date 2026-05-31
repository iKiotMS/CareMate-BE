import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UseGuards,
  Req,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { v2 as cloudinary } from "cloudinary";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("uploads")
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post("photos")
  @UseInterceptors(FilesInterceptor("files", 10))
  async uploadPhotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided");
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "cleaning/orders",
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          stream.end(file.buffer);
        });
        uploadedUrls.push((result as any).secure_url);
      } catch (error) {
        throw new BadRequestException(`Failed to upload file: ${error}`);
      }
    }

    return { urls: uploadedUrls };
  }
}
