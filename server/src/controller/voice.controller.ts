import type { NextFunction, Response } from "express";
import multer from "multer";
import { Types } from "mongoose";
import type { AuthRequest } from "../middleware/auth.middleware";
import { Case, CaseStatus } from "../models/case.model";
import { isAIIntakeConfigurationError } from "../utils/aiIntake";
import { patientOwnedCaseFilter } from "../utils/caseAccess";
import {
  MAX_VOICE_UPLOAD_BYTES,
  SUPPORTED_VOICE_MIME_TYPES,
  transcribeIntakeAudio,
} from "../utils/voiceTranscription";

const uploadVoice = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VOICE_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const mimeType = file.mimetype.split(";")[0]?.trim().toLowerCase();
    if (!mimeType || !SUPPORTED_VOICE_MIME_TYPES.has(mimeType)) {
      callback(
        new Error("Record audio as WebM, MP4, OGG, WAV, AAC, MP3, or FLAC."),
      );
      return;
    }
    callback(null, true);
  },
}).single("audio");

export const uploadIntakeVoice = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  uploadVoice(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Voice recordings must be 10 MB or smaller. Record a shorter message."
          : "Upload one voice recording at a time.";
      return res.status(400).json({ success: false, message });
    }
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to read the recording.",
      });
    }
    next();
  });
};

export const transcribePatientIntakeVoice = async (
  req: AuthRequest,
  res: Response,
) => {
  const { caseId } = req.params;
  const patientId = req.user?.userId;
  if (
    typeof caseId !== "string" ||
    !Types.ObjectId.isValid(caseId) ||
    !patientId
  ) {
    return res.status(400).json({ success: false, message: "Invalid care case" });
  }
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Record a voice message first." });
  }

  const ownershipFilter = patientOwnedCaseFilter(caseId, patientId);
  if (!ownershipFilter) {
    return res.status(400).json({ success: false, message: "Invalid care case" });
  }

  try {
    const caseRecord = await Case.findOne(ownershipFilter);
    if (!caseRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Care case not found" });
    }
    if (!caseRecord.consent?.acceptedAt || !caseRecord.consent.version) {
      return res.status(403).json({
        success: false,
        message: "Consent is required before transcribing a voice message",
      });
    }
    if (
      ![
        CaseStatus.NEW,
        CaseStatus.AI_PROCESSING,
        CaseStatus.WAITING_FOR_PATIENT,
      ].includes(caseRecord.status)
    ) {
      return res.status(409).json({
        success: false,
        message: "This case is not accepting patient intake messages",
      });
    }

    const transcript = await transcribeIntakeAudio(
      caseRecord.intakeLanguage,
      req.file.buffer,
      req.file.mimetype,
    );
    return res.status(200).json({
      success: true,
      data: { transcript },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safeMessage =
      message.startsWith("The AI assistant") ||
      message.startsWith("The AI service") ||
      isAIIntakeConfigurationError(message) ||
      message.startsWith("Voice transcription") ||
      message.startsWith("No speech") ||
      message.startsWith("The audio") ||
      message.startsWith("Record ") ||
      message.startsWith("The transcript")
        ? message
        : "Unable to transcribe your voice message. Please try again.";
    return res
      .status(isAIIntakeConfigurationError(message) ? 503 : 502)
      .json({
        success: false,
        message: safeMessage,
      });
  }
};
