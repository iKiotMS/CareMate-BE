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

  const r = req as any;

  console.log(`[API] ${req.method} ${req.url}`);
  console.log(`[API] Content-Type: ${req.headers['content-type']}`);
  console.log(`[API] Body before parse:`, r.body ? "exists" : "undefined");

  // Vercel pre-parses the body and sets req.body before calling this handler.
  if (r.body !== undefined) {
    console.log(`[API] Body detected (Vercel pre-parsed):`, JSON.stringify(r.body).substring(0, 100));
    r._body = true;
  }

  cachedHandler(req, res);
};
