import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import type { IncomingMessage, ServerResponse } from "http";

let cachedHandler: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async (req: IncomingMessage, res: ServerResponse) => {
  if (!cachedHandler) cachedHandler = await bootstrap();
  cachedHandler(req, res);
};
