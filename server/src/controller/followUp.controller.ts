import { createHash } from "node:crypto";
import type { Response } from "express";
import { Types } from "mongoose";
import type { AuthRequest } from "../middleware/auth.middleware";
import { Answer, AnswerMode } from "../models/answer.model";
import { Case, CaseStatus } from "../models/case.model";
import { CaseInput, InputMode } from "../models/caseInput.model";
import { Question, QuestionStatus } from "../models/question.model";
import { appendCaseAudit } from "../utils/caseAudit";
import { patientOwnedCaseFilter } from "../utils/caseAccess";
import { isAllowedStatusTransition } from "../utils/caseWorkflow";
import { notifyCareTeamAnswer } from "../utils/notifications";
import { createFollowUpRoomToken } from "../utils/livekitToken";

const activeStatuses = [QuestionStatus.SENT, QuestionStatus.IN_PROGRESS, QuestionStatus.ANSWERED, QuestionStatus.REVIEWED];

function validId(value: unknown): value is string {
  return typeof value === "string" && Types.ObjectId.isValid(value);
}

async function getOwnedFollowUp(questionId: string, patientId: string) {
  if (!validId(questionId) || !Types.ObjectId.isValid(patientId)) return null;
  const question = await Question.findById(questionId);
  if (!question || !activeStatuses.includes(question.status)) return null;
  const ownedCaseFilter = patientOwnedCaseFilter(question.caseId.toString(), patientId);
  if (!ownedCaseFilter) return null;
  const caseRecord = await Case.findOne(ownedCaseFilter);
  if (!caseRecord) return null;
  return { question, caseRecord };
}

export async function listPatientFollowUps(req: AuthRequest, res: Response) {
  const patientId = req.user?.userId;
  if (!patientId || !Types.ObjectId.isValid(patientId)) return res.status(401).json({ success: false, message: "Patient authentication required" });
  const cases = await Case.find({ patientId: new Types.ObjectId(patientId) }).select("_id caseNo intakeLanguage status").lean();
  if (!cases.length) return res.status(200).json({ success: true, data: [] });
  const caseMap = new Map(cases.map((item) => [item._id.toString(), item]));
  const questions = await Question.find({
    caseId: { $in: cases.map((item) => item._id) },
    status: { $in: activeStatuses },
    source: { $in: ["STAFF", "AI"] },
  }).sort({ updatedAt: -1 }).limit(100).lean();
  const answers = await Answer.find({ questionId: { $in: questions.map((item) => item._id) } })
    .select("questionId answer mode createdAt").lean();
  const answerMap = new Map(answers.map((item) => [item.questionId.toString(), item]));
  return res.status(200).json({
    success: true,
    data: questions.map((question) => {
      const caseData = caseMap.get(question.caseId.toString());
      const answer = answerMap.get(question._id.toString());
      return {
        id: question._id,
        caseId: question.caseId,
        caseNo: caseData?.caseNo ?? "Care case",
        language: caseData?.intakeLanguage ?? "english",
        caseStatus: caseData?.status,
        question: question.question,
        source: question.source,
        status: question.status,
        createdAt: question.createdAt,
        answer: answer ? { answer: answer.answer, mode: answer.mode, createdAt: answer.createdAt } : null,
      };
    }),
  });
}

export async function getPatientFollowUp(req: AuthRequest, res: Response) {
  const patientId = req.user?.userId;
  const questionId = req.params.questionId;
  if (!patientId || !validId(questionId)) return res.status(400).json({ success: false, message: "Invalid follow-up reference" });
  const owned = await getOwnedFollowUp(questionId, patientId);
  if (!owned) return res.status(404).json({ success: false, message: "Follow-up not found" });
  const answer = await Answer.findOne({ questionId: owned.question._id }).select("answer mode idempotencyKey payloadHash createdAt").lean();
  return res.status(200).json({
    success: true,
    data: {
      id: owned.question._id,
      caseId: owned.caseRecord._id,
      caseNo: owned.caseRecord.caseNo,
      language: owned.caseRecord.intakeLanguage,
      question: owned.question.question,
      status: owned.question.status,
      createdAt: owned.question.createdAt,
      answer: answer ? { answer: answer.answer, mode: answer.mode, createdAt: answer.createdAt } : null,
    },
  });
}

export async function createPatientFollowUpVoiceToken(req: AuthRequest, res: Response) {
  const patientId = req.user?.userId;
  const questionId = req.params.questionId;
  if (!patientId || !validId(questionId)) return res.status(400).json({ success: false, message: "Invalid follow-up reference" });
  const owned = await getOwnedFollowUp(questionId, patientId);
  if (!owned) return res.status(404).json({ success: false, message: "Follow-up not found" });
  if (![QuestionStatus.SENT, QuestionStatus.IN_PROGRESS].includes(owned.question.status)) {
    return res.status(409).json({ success: false, message: "This follow-up is not accepting an answer" });
  }
  try {
    const data = createFollowUpRoomToken({
      userId: patientId,
      questionId,
      language: owned.caseRecord.intakeLanguage,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safeMessage = message.startsWith("LiveKit is not configured") || message.startsWith("LIVEKIT_URL")
      ? message
      : "Voice follow-up is unavailable. You can still answer by text.";
    return res.status(503).json({ success: false, message: safeMessage });
  }
}

export async function submitPatientFollowUpAnswer(req: AuthRequest, res: Response) {
  const patientId = req.user?.userId;
  const questionId = req.params.questionId;
  const idempotencyKey = req.header("Idempotency-Key")?.trim();
  const answerText = typeof req.body?.answer === "string" ? req.body.answer.trim() : "";
  const requestedMode = req.body?.mode;
  const mode = requestedMode === AnswerMode.VOICE ? AnswerMode.VOICE : requestedMode === AnswerMode.TEXT || requestedMode === undefined ? AnswerMode.TEXT : null;
  if (!patientId || !validId(questionId)) return res.status(400).json({ success: false, message: "Invalid follow-up reference" });
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return res.status(400).json({ success: false, message: "A stable Idempotency-Key is required to submit an answer" });
  }
  if (!mode || !answerText || answerText.length > 4000) {
    return res.status(400).json({ success: false, message: "Provide an answer under 4,000 characters and select a valid answer mode" });
  }

  const owned = await getOwnedFollowUp(questionId, patientId);
  if (!owned) return res.status(404).json({ success: false, message: "Follow-up not found" });
  const payloadHash = createHash("sha256").update(JSON.stringify({ answer: answerText, mode })).digest("hex");

  const existingAnswer = await Answer.findOne({ questionId: owned.question._id }).lean();
  if (existingAnswer) {
    if (existingAnswer.idempotencyKey === idempotencyKey && existingAnswer.payloadHash === payloadHash) {
      return res.status(200).json({
        success: true,
        replayed: true,
        data: { questionId, status: owned.question.status, answer: existingAnswer.answer, mode: existingAnswer.mode, createdAt: existingAnswer.createdAt },
      });
    }
    return res.status(409).json({ success: false, message: "An answer was already submitted for this question. Ask the care team to create a new follow-up if more information is needed." });
  }

  // Claim with a compare-and-set: only the original submission key can resume an
  // interrupted IN_PROGRESS write. A different concurrent request cannot win.
  let question = await Question.findOneAndUpdate(
    { _id: owned.question._id, caseId: owned.caseRecord._id, status: QuestionStatus.SENT },
    { $set: { status: QuestionStatus.IN_PROGRESS, submissionKey: idempotencyKey } },
    { new: true },
  );
  if (!question) {
    question = await Question.findOne({
      _id: owned.question._id,
      caseId: owned.caseRecord._id,
      status: QuestionStatus.IN_PROGRESS,
      submissionKey: idempotencyKey,
    });
    if (!question) return res.status(409).json({ success: false, message: "This follow-up is being answered in another session or is no longer accepting responses." });
  }

  // Preserve answer text in the standard per-question answer model and intake
  // history; never fan one response out to multiple pending questions.
  try {
    const [answer] = await Promise.all([
      Answer.create({
        questionId: question._id,
        answer: answerText,
        mode,
        idempotencyKey,
        payloadHash,
        submittedById: new Types.ObjectId(patientId),
      }),
      CaseInput.create({
        caseId: owned.caseRecord._id,
        mode: mode === AnswerMode.VOICE ? InputMode.VOICE : InputMode.TEXT,
        content: answerText,
        language: owned.caseRecord.intakeLanguage,
        sourceName: `follow-up:${question._id.toString()}`,
      }),
    ]);
    question.status = QuestionStatus.ANSWERED;
    await question.save();

    const remaining = await Question.countDocuments({
      caseId: owned.caseRecord._id,
      status: { $in: [QuestionStatus.SENT, QuestionStatus.IN_PROGRESS] },
      _id: { $ne: question._id },
    });
    if (remaining === 0 && owned.caseRecord.status === CaseStatus.WAITING_FOR_PATIENT && isAllowedStatusTransition(owned.caseRecord.status, CaseStatus.WAITING_FOR_REVIEW)) {
      const oldStatus = owned.caseRecord.status;
      owned.caseRecord.status = CaseStatus.WAITING_FOR_REVIEW;
      await owned.caseRecord.save();
      await appendCaseAudit(owned.caseRecord._id, {
        action: "PATIENT_FOLLOW_UP_ANSWERED",
        actorId: new Types.ObjectId(patientId),
        timestamp: new Date(),
        fromStatus: oldStatus,
        toStatus: owned.caseRecord.status,
      });
    } else {
      await appendCaseAudit(owned.caseRecord._id, {
        action: "PATIENT_FOLLOW_UP_ANSWERED",
        actorId: new Types.ObjectId(patientId),
        timestamp: new Date(),
      });
    }
    await notifyCareTeamAnswer(owned.caseRecord._id, question._id, new Types.ObjectId(patientId));
    return res.status(201).json({ success: true, replayed: false, data: { questionId, status: question.status, answer: answer.answer, mode: answer.mode, createdAt: answer.createdAt } });
  } catch (error) {
    const duplicateKey = !!error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000;
    if (duplicateKey) {
      const saved = await Answer.findOne({ questionId: owned.question._id }).lean();
      if (saved?.idempotencyKey === idempotencyKey && saved.payloadHash === payloadHash) {
        await Question.updateOne({ _id: owned.question._id }, { $set: { status: QuestionStatus.ANSWERED } });
        return res.status(200).json({ success: true, replayed: true, data: { questionId, status: QuestionStatus.ANSWERED, answer: saved.answer, mode: saved.mode, createdAt: saved.createdAt } });
      }
      return res.status(409).json({ success: false, message: "A response for this follow-up is already being saved or has already been saved." });
    }
    // Leave the question IN_PROGRESS with its same submission key. A network
    // retry of this exact request can safely resume; a different payload cannot.
    return res.status(503).json({ success: false, message: "Your answer may have been saved. Retry the same submission without changing the answer." });
  }
}
