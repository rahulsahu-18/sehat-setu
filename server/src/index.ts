import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { resolve } from "node:path";

import { connectDB } from "./utils/db.config";

import patientRouter from "./routes/patient.routes";
import userRouter from "./routes/user.routes";
import facilityRouter from "./routes/facility.routes";
import staffRoutes from "./routes/staff.routes";
import { startRetentionCleanup } from "./utils/caseData";
import notificationRoutes from "./routes/notification.routes";
import voiceAgentRoutes from "./routes/voiceAgent.routes";

if (!process.env.OPENAI_API_KEY?.trim()) {
  delete process.env.OPENAI_API_KEY;
}
dotenv.config({ path: resolve(__dirname, "../.env") });

const requiredVariables = ["MONGO_URI", "JWT_SECRET"] as const;
for (const variable of requiredVariables) {
  if (!process.env[variable]?.trim()) {
    throw new Error(`Required environment variable ${variable} is missing.`);
  }
}
if (process.env.NODE_ENV === "production") {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("Required environment variable OPENAI_API_KEY is missing.");
  }
  if (!process.env.CLIENT_ORIGINS?.trim()) {
    throw new Error("Required environment variable CLIENT_ORIGINS is missing.");
  }
  if ((process.env.JWT_SECRET || "").length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }
  const clinicalApprovalFields = [
    "CLINICAL_SAFETY_POLICY_STATUS",
    "CLINICAL_SAFETY_POLICY_APPROVED_BY",
    "CLINICAL_SAFETY_POLICY_APPROVED_AT",
    "CLINICAL_SAFETY_POLICY_REVIEW_RECORD",
  ] as const;
  if (
    process.env.CLINICAL_SAFETY_POLICY_STATUS !== "approved" ||
    clinicalApprovalFields.slice(1).some((name) => !process.env[name]?.trim())
  ) {
    throw new Error(
      "Production startup blocked: a qualified clinical lead must review and record approval of the configured safety policy.",
    );
  }
  if (Number.isNaN(Date.parse(process.env.CLINICAL_SAFETY_POLICY_APPROVED_AT || ""))) {
    throw new Error("CLINICAL_SAFETY_POLICY_APPROVED_AT must be a valid ISO date.");
  }
}

const allowedOrigins = (
  process.env.CLIENT_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
for (const origin of allowedOrigins) {
  const parsedOrigin = new URL(origin);
  if (
    parsedOrigin.origin !== origin ||
    !["http:", "https:"].includes(parsedOrigin.protocol)
  ) {
    throw new Error(
      "CLIENT_ORIGINS must contain comma-separated origins without paths.",
    );
  }
}

const app = express();
const retentionDays = Number(process.env.DATA_RETENTION_DAYS || 90);
if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
  throw new Error("DATA_RETENTION_DAYS must be an integer between 1 and 3650.");
}

app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.includes(origin)),
  }),
);
app.use(express.json({ limit: "256kb" }));

app.get("/", (_req, res) => {
  res.send("Server is running");
});

app.get("/health", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  return res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
    database: databaseReady ? "connected" : "disconnected",
    aiIntakeConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
});

app.use("/api/v1/patient", patientRouter);
app.use("/api/v1/staff", staffRoutes);

app.use("/api/v1/user", userRouter);

app.use("/api/v1/facility", facilityRouter);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/internal/voice", voiceAgentRoutes);

const PORT = Number(process.env.PORT || 5000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

const errorHandler: ErrorRequestHandler = (_error, _req, res, _next) => {
  return res.status(500).json({
    success: false,
    message: "The server could not complete this request.",
  });
};
app.use(errorHandler);

async function startServer() {
  await connectDB();
  startRetentionCleanup(retentionDays);
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch(() => {
  console.error(
    "Server startup failed. Check database and required configuration.",
  );
  process.exit(1);
});
