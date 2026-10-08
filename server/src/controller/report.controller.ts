import type { NextFunction, Response } from "express";
import multer from "multer";
import { Types } from "mongoose";
import type { AuthRequest } from "../middleware/auth.middleware";
import { AISummary } from "../models/AISummary.model";
import { Case, CasePriority, CaseStatus } from "../models/case.model";
import { CaseInput, InputMode } from "../models/caseInput.model";
import { Question, QuestionSource, QuestionStatus } from "../models/question.model";
import { appendCaseAudit } from "../utils/caseAudit";
import {
  generateIntakeReply,
  isAIIntakeConfigurationError,
  type IntakeChatMessage,
} from "../utils/aiIntake";
import { patientOwnedCaseFilter } from "../utils/caseAccess";
import { isAllowedStatusTransition } from "../utils/caseWorkflow";
import { persistIntakeSummary } from "../utils/intakeConversation";
import { evaluateSafetyFlags } from "../utils/triageRules";
import {
  extractReportText,
  MAX_REPORT_UPLOAD_BYTES,
  safeReportName,
} from "../utils/reportText";

const supportedTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_REPORT_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!supportedTypes.has(file.mimetype)) {
      callback(new Error("Upload a PDF, TXT, or CSV report."));
      return;
    }
    callback(null, true);
  },
}).single("report");

export const uploadPatientReport = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  upload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Report files must be 5 MB or smaller."
          : "Upload one PDF, TXT, or CSV report at a time.";
      return res.status(400).json({ success: false, message });
    }
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to read the report upload.",
      });
    }
    next();
  });
};

export const processPatientReport = async (req: AuthRequest, res: Response) => {
  const { caseId } = req.params;
  const patientId = req.user?.userId;
  if (!patientId || typeof caseId !== "string" || !Types.ObjectId.isValid(caseId)) {
    return res.status(400).json({ success: false, message: "Invalid care case" });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Choose a report to upload." });
  }

  const ownershipFilter = patientOwnedCaseFilter(caseId, patientId);
  if (!ownershipFilter) {
    return res.status(400).json({ success: false, message: "Invalid care case" });
  }

  try {
    const caseRecord = await Case.findOne(ownershipFilter);
    if (!caseRecord) {
      return res.status(404).json({ success: false, message: "Care case not found" });
    }
    if (!caseRecord.consent?.acceptedAt || !caseRecord.consent.version) {
      return res.status(403).json({
        success: false,
        message: "Consent is required before uploading a report.",
      });
    }
    if (
      ![CaseStatus.NEW, CaseStatus.AI_PROCESSING, CaseStatus.WAITING_FOR_PATIENT]
        .includes(caseRecord.status)
    ) {
      return res.status(409).json({
        success: false,
        message: "This case is not accepting report uploads.",
      });
    }

    const extractedText = await extractReportText(req.file);
    const sourceName = safeReportName(req.file.originalname);
    const latestSummary = await AISummary.findOne({ caseId: caseRecord._id })
      .sort({ version: -1 });
    const savedInputs = latestSummary?.data.conversationSource === "server-generated-v1"
      ? []
      : await CaseInput.find({
          caseId: caseRecord._id,
          mode: { $in: [InputMode.TEXT, InputMode.DOCUMENT] },
        })
          .sort({ createdAt: 1 })
          .select("content mode sourceName");
    const history: IntakeChatMessage[] =
      latestSummary?.data.conversationSource === "server-generated-v1" &&
      Array.isArray(latestSummary.data.conversation)
        ? latestSummary.data.conversation
            .filter(
              (message): message is IntakeChatMessage =>
                !!message &&
                (message.role === "user" || message.role === "assistant") &&
                typeof message.content === "string",
            )
            .slice(-14)
        : savedInputs.map((input) => ({
            role: "user" as const,
            content:
              input.mode === InputMode.DOCUMENT
                ? `Uploaded report${input.sourceName ? ` (${input.sourceName})` : ""}:\n${input.content}`
                : input.content,
          }));
    const patientMessage = `Uploaded report (${sourceName}); extracted text is unverified source material:\n${extractedText.slice(0, 4000)}`;
    const conversation = [
      ...history,
      { role: "user" as const, content: patientMessage },
    ];
    const reply = await generateIntakeReply(caseRecord.intakeLanguage, conversation);
    const safetyFlags = evaluateSafetyFlags(
      conversation
        .filter((message) => message.role === "user")
        .map((message) => message.content),
      caseRecord.intakeLanguage,
    );
    const previousQuestions = await Question.find({ caseId: caseRecord._id })
      .select("question");
    const knownQuestions = new Set(
      previousQuestions.map((item) =>
        item.question.toLowerCase().replace(/[?.!,،؟]+/g, "").replace(/\s+/g, " ").trim(),
      ),
    );
    const followUpQuestions = reply.followUpQuestions.filter((question) => {
      const normalized = question.toLowerCase().replace(/[?.!,،؟]+/g, "").replace(/\s+/g, " ").trim();
      if (!normalized || knownQuestions.has(normalized)) return false;
      knownQuestions.add(normalized);
      return true;
    });
    const assistantMessage = safetyFlags[0]?.instruction || reply.message;
    const previousStatus = caseRecord.status;
    const previousPriority = caseRecord.priority;
    const targetStatus = safetyFlags.length
      ? CaseStatus.ESCALATED
      : previousStatus === CaseStatus.WAITING_FOR_PATIENT
        ? CaseStatus.WAITING_FOR_PATIENT
        : reply.complete
          ? CaseStatus.WAITING_FOR_REVIEW
          : CaseStatus.AI_PROCESSING;
    if (!isAllowedStatusTransition(previousStatus, targetStatus)) {
      return res.status(409).json({
        success: false,
        message: "This case cannot move to the next report-review status.",
      });
    }

    await CaseInput.create({
      caseId: caseRecord._id,
      mode: InputMode.DOCUMENT,
      content: extractedText,
      language: caseRecord.intakeLanguage,
      sourceName,
    });
    const savedSummary = await persistIntakeSummary(
      caseRecord._id,
      history,
      patientMessage,
      assistantMessage,
      {
        summary: reply.summary,
        missingInformation: reply.missingInformation,
        contradictions: reply.contradictions,
        timeline: reply.timeline,
        urgencySignals: reply.urgencySignals,
        deterministicSafetyFlags: safetyFlags,
        conversationSource: "server-generated-v1",
        followUpQuestions,
        complete: reply.complete,
      },
    );
    if (followUpQuestions.length && !safetyFlags.length) {
      await Question.insertMany(
        followUpQuestions.map((question) => ({
          caseId: caseRecord._id,
          question,
          source: QuestionSource.AI,
          status: QuestionStatus.PENDING,
        })),
      );
    }
    caseRecord.status = targetStatus;
    if (safetyFlags.length) caseRecord.priority = CasePriority.URGENT;
    await caseRecord.save();
    if (
      targetStatus !== previousStatus &&
      targetStatus !== CaseStatus.WAITING_FOR_PATIENT
    ) {
      await Question.updateMany(
        {
          caseId: caseRecord._id,
          status: {
            $in: [
              QuestionStatus.PENDING,
              QuestionStatus.APPROVED,
              QuestionStatus.SENT,
            ],
          },
        },
        { $set: { status: QuestionStatus.CANCELLED } },
      );
    }
    await appendCaseAudit(caseRecord._id, {
      action: "PATIENT_REPORT_UPLOADED",
      actorId: new Types.ObjectId(patientId),
      timestamp: new Date(),
      fromStatus: previousStatus,
      toStatus: targetStatus,
      fromPriority: previousPriority,
      toPriority: caseRecord.priority,
    });

    return res.status(201).json({
      success: true,
      data: {
        status: caseRecord.status,
        priority: caseRecord.priority,
        summary: savedSummary.data,
        missingInformation: reply.missingInformation,
        contradictions: reply.contradictions,
        timeline: reply.timeline,
        urgencySignals: reply.urgencySignals,
        deterministicSafetyFlags: safetyFlags,
        followUpQuestions,
        complete: reply.complete,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.startsWith("Upload ") ||
      message.startsWith("The uploaded file") ||
      message.startsWith("PDF reports") ||
      message.startsWith("Text reports") ||
      message.startsWith("No selectable text") ||
      message.startsWith("Unable to extract text") ||
      message.startsWith("The report contains")
    ) {
      return res.status(400).json({ success: false, message });
    }
    const safeMessage = message.startsWith("The AI assistant")
      ? message
      : "Unable to process the report. Please try again.";
    return res
      .status(isAIIntakeConfigurationError(message) ? 503 : 502)
      .json({
        success: false,
        message: safeMessage,
      });
  }
};
