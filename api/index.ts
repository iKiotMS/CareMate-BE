import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import type { IncomingMessage, ServerResponse } from "http";

let cachedHandler: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: process.env.FRONTEND_URL ? true : false,
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

  // Vercel pre-parses the body and sets req.body before calling this handler.
  // Without this, Express body-parser re-reads the already-consumed stream and
  // overwrites req.body with {}, so loginDto.phone arrives as undefined → 401.
  const r = req as any;
  if (r.body !== undefined) {
    r._body = true;
  }

  cachedHandler(req, res);
};
