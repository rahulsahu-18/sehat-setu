import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Case } from "../models/case.model";
import { Question, QuestionStatus } from "../models/question.model";
import { detectFollowUpLanguage } from "../utils/followUpLanguage";

function equalSecret(provided: string, expected: string) {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function getVoiceAgentFollowUp(req: Request, res: Response) {
  const expectedSecret = process.env.VOICE_AGENT_SECRET?.trim();
  const providedSecret = req.header("X-Voice-Agent-Secret") || "";
  if (!expectedSecret || !equalSecret(providedSecret, expectedSecret)) {
    return res.status(401).json({ success: false, message: "Agent authentication failed" });
  }
  const questionId = req.params.questionId;
  if (typeof questionId !== "string" || !Types.ObjectId.isValid(questionId)) {
    return res.status(400).json({ success: false, message: "Invalid question reference" });
  }
  const question = await Question.findById(questionId).select("caseId question source status").lean();
  if (!question || ![QuestionStatus.SENT, QuestionStatus.IN_PROGRESS].includes(question.status)) {
    return res.status(404).json({ success: false, message: "Follow-up not available" });
  }
  const caseRecord = await Case.findById(question.caseId).select("intakeLanguage").lean();
  if (!caseRecord) return res.status(404).json({ success: false, message: "Care case not found" });
  return res.status(200).json({
    success: true,
    data: {
      questionId: question._id,
      question: question.question,
      language: detectFollowUpLanguage(question.question, caseRecord.intakeLanguage),
      status: question.status,
    },
  });
}
