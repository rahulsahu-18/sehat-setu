import type { Response } from "express";
import { Types } from "mongoose";
import type { AuthRequest } from "../middleware/auth.middleware";
import { Answer, AnswerMode } from "../models/answer.model";
import { Case, CaseStatus } from "../models/case.model";
import { Question, QuestionStatus } from "../models/question.model";
import { appendCaseAudit } from "../utils/caseAudit";
import { patientOwnedCaseFilter } from "../utils/caseAccess";
import { isAllowedStatusTransition } from "../utils/caseWorkflow";
import { notifyCareTeamAnswer } from "../utils/notifications";
import { createFollowUpRoomToken } from "../utils/livekitToken";
import { isAllowedFollowUpTransition } from "../utils/followUpWorkflow";
import { hashFollowUpAnswer, matchesIdempotentAnswer, validFollowUpIdempotencyKey } from "../utils/followUpIdempotency";

const activeStatuses = [
  QuestionStatus.SENT,
  QuestionStatus.IN_PROGRESS,
  QuestionStatus.ANSWERED,
  QuestionStatus.REVIEWED,
];

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

async function finalizeSavedAnswer(
  questionId: Types.ObjectId,
  caseId: Types.ObjectId,
  patientId: Types.ObjectId,
  idempotencyKey: string,
) {
  const changedQuestion = await Question.findOneAndUpdate(
    {
      _id: questionId,
      caseId,
      status: QuestionStatus.IN_PROGRESS,
      submissionKey: idempotencyKey,
    },
    { $set: { status: QuestionStatus.ANSWERED } },
    { new: true },
  );
  if (changedQuestion) {
    await appendCaseAudit(caseId, {
      action: "PATIENT_FOLLOW_UP_ANSWERED",
      actorId: patientId,
      timestamp: new Date(),
    });
  }

  const remaining = await Question.countDocuments({
    caseId,
    status: { $in: [QuestionStatus.SENT, QuestionStatus.IN_PROGRESS] },
  });
  if (
    remaining === 0 &&
    isAllowedStatusTransition(CaseStatus.WAITING_FOR_PATIENT, CaseStatus.WAITING_FOR_REVIEW)
  ) {
    const updatedCase = await Case.findOneAndUpdate(
      { _id: caseId, status: CaseStatus.WAITING_FOR_PATIENT },
      { $set: { status: CaseStatus.WAITING_FOR_REVIEW } },
      { new: true },
    );
    if (updatedCase) {
      await appendCaseAudit(caseId, {
        action: "FOLLOW_UP_RESPONSES_COMPLETE",
        actorId: patientId,
        timestamp: new Date(),
        fromStatus: CaseStatus.WAITING_FOR_PATIENT,
        toStatus: CaseStatus.WAITING_FOR_REVIEW,
      });
    }
  }
  // Upsert makes notification repair safe after a crash between answer storage
  // and the notification write.
  await notifyCareTeamAnswer(caseId, questionId, patientId);
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
  const answer = await Answer.findOne({ questionId: owned.question._id }).select("answer mode createdAt").lean();
  return res.status(200).json({
    success: true,
    data: {
      id: owned.question._id,
      caseId: owned.caseRecord._id,
      caseNo: owned.caseRecord.caseNo,
      language: owned.caseRecord.intakeLanguage,
      question: owned.question.question,
      source: owned.question.source,
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
  if (!isAllowedFollowUpTransition(owned.question.status, QuestionStatus.IN_PROGRESS)) {
    return res.status(409).json({ success: false, message: "This follow-up cannot enter a voice session from its current state" });
  }
  try {
    // IN_PROGRESS means the patient has opened the live follow-up session.
    // The idempotency key remains unset until the answer is submitted.
    await Question.updateOne(
      { _id: owned.question._id, caseId: owned.caseRecord._id, status: QuestionStatus.SENT },
      { $set: { status: QuestionStatus.IN_PROGRESS } },
    );
    const data = createFollowUpRoomToken({ userId: patientId, questionId, language: owned.caseRecord.intakeLanguage });
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
  const rawKey = req.header("Idempotency-Key")?.trim();
  const answerText = typeof req.body?.answer === "string" ? req.body.answer.trim() : "";
  const requestedMode = req.body?.mode;
  const mode = requestedMode === AnswerMode.VOICE ? AnswerMode.VOICE : requestedMode === AnswerMode.TEXT || requestedMode === undefined ? AnswerMode.TEXT : null;
  if (!patientId || !validId(questionId)) return res.status(400).json({ success: false, message: "Invalid follow-up reference" });
  if (!validFollowUpIdempotencyKey(rawKey)) return res.status(400).json({ success: false, message: "A stable Idempotency-Key is required to submit an answer" });
  if (!mode || !answerText || answerText.length > 4000) return res.status(400).json({ success: false, message: "Provide an answer under 4,000 characters and select a valid answer mode" });

  const owned = await getOwnedFollowUp(questionId, patientId);
  if (!owned) return res.status(404).json({ success: false, message: "Follow-up not found" });
  const payloadHash = hashFollowUpAnswer(answerText, mode);
  const existingAnswer = await Answer.findOne({ questionId: owned.question._id }).lean();
  if (existingAnswer) {
    if (matchesIdempotentAnswer(existingAnswer, rawKey, payloadHash)) {
      await finalizeSavedAnswer(owned.question._id, owned.caseRecord._id, new Types.ObjectId(patientId), rawKey);
      const refreshed = await Question.findById(owned.question._id).select("status").lean();
      return res.status(200).json({
        success: true,
        replayed: true,
        data: { questionId, status: refreshed?.status ?? QuestionStatus.ANSWERED, answer: existingAnswer.answer, mode: existingAnswer.mode, createdAt: existingAnswer.createdAt },
      });
    }
    return res.status(409).json({ success: false, message: "An answer was already submitted for this question. Ask the care team to create a new follow-up if more information is needed." });
  }

  if (!isAllowedFollowUpTransition(owned.question.status, QuestionStatus.IN_PROGRESS)) {
    return res.status(409).json({ success: false, message: "This follow-up cannot accept an answer from its current state" });
  }

  // Compare-and-set locks a question to one idempotency key. If a worker
  // disappeared before saving any answer, allow a lease to be recovered after
  // two minutes. The unique partial answer index prevents double writes.
  const expiredLeaseBefore = new Date(Date.now() - 2 * 60 * 1000);
  let question = await Question.findOneAndUpdate(
    {
      _id: owned.question._id,
      caseId: owned.caseRecord._id,
      status: { $in: [QuestionStatus.SENT, QuestionStatus.IN_PROGRESS] },
      $or: [
        { submissionKey: { $exists: false } },
        { submissionStartedAt: { $lt: expiredLeaseBefore } },
      ],
    },
    {
      $set: {
        status: QuestionStatus.IN_PROGRESS,
        submissionKey: rawKey,
        submissionStartedAt: new Date(),
      },
    },
    { new: true },
  );
  if (!question) {
    question = await Question.findOne({
      _id: owned.question._id,
      caseId: owned.caseRecord._id,
      status: QuestionStatus.IN_PROGRESS,
      submissionKey: rawKey,
    });
    if (!question) return res.status(409).json({ success: false, message: "This follow-up is being answered in another session or is no longer accepting responses." });
  }

  try {
    const answer = await Answer.create({
      questionId: question._id,
      answer: answerText,
      mode,
      idempotencyKey: rawKey,
      payloadHash,
      submittedById: new Types.ObjectId(patientId),
    });
    await finalizeSavedAnswer(question._id, owned.caseRecord._id, new Types.ObjectId(patientId), rawKey);
    const refreshed = await Question.findById(question._id).select("status").lean();
    return res.status(201).json({
      success: true,
      replayed: false,
      data: { questionId, status: refreshed?.status ?? QuestionStatus.ANSWERED, answer: answer.answer, mode: answer.mode, createdAt: answer.createdAt },
    });
  } catch (error) {
    const duplicateKey = !!error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000;
    if (duplicateKey) {
      const saved = await Answer.findOne({ questionId: owned.question._id }).lean();
      if (saved && matchesIdempotentAnswer(saved, rawKey, payloadHash)) {
        await finalizeSavedAnswer(question._id, owned.caseRecord._id, new Types.ObjectId(patientId), rawKey);
        return res.status(200).json({ success: true, replayed: true, data: { questionId, status: QuestionStatus.ANSWERED, answer: saved.answer, mode: saved.mode, createdAt: saved.createdAt } });
      }
      return res.status(409).json({ success: false, message: "A response for this follow-up is already saved." });
    }
    // If persistence succeeded but a later write failed, retrying the same key
    // repairs the lifecycle and notifications without creating another answer.
    return res.status(503).json({ success: false, message: "Your answer may have been saved. Retry the same submission without changing the answer." });
  }
}
