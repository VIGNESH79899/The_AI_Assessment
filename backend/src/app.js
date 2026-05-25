import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";
import { env } from "./config/env.js";
import { configurePassport } from "./config/passport.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { adminRouter } from "./routes/admin.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { generatorRouter } from "./routes/generator.routes.js";
import { subscriptionRouter } from "./routes/subscription.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";

export function createApp() {
  const app = express();
  configurePassport();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://assessmentmaker.vercel.app"
  ],
  credentials: true
}));
  app.use(morgan("dev"));
  app.use(cookieParser(env.cookieSecret));

  app.use("/api", webhookRouter);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(passport.initialize());
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000,              // raised from 300 → 1000 per window
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only count failed requests against limit
    message: { message: "Too many requests. Please wait a moment and try again." }
  }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "assessment-maker-premium-api" }));
  app.use("/api/auth", authRouter);
  app.use("/api", subscriptionRouter);
  app.use("/api", generatorRouter);
  app.use("/api", adminRouter);
  app.use("/api", uploadRouter);
  app.use(notFound);
  app.use(errorHandler);
  app.get("/", (req, res) => {
  res.json({
    status: "Backend running successfully 🚀"
  });
});

  return app;
}
