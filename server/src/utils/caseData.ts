import { Types } from "mongoose";
import { Answer } from "../models/answer.model";
import { AISummary } from "../models/AISummary.model";
import { Case } from "../models/case.model";
import { CaseInput } from "../models/caseInput.model";
import { Decision } from "../models/decision.model";
import { Question } from "../models/question.model";
import { ReferralNote } from "../models/referralNote.model";
import { Notification } from "../models/notification.model";

export async function deleteCaseData(caseId: Types.ObjectId) {
  const questionIds = await Question.find({ caseId }).distinct("_id");
  if (questionIds.length) {
    await Answer.deleteMany({ questionId: { $in: questionIds } });
  }
  await Promise.all([
    CaseInput.deleteMany({ caseId }),
    AISummary.deleteMany({ caseId }),
    Decision.deleteMany({ caseId }),
    Question.deleteMany({ caseId }),
    ReferralNote.deleteMany({ caseId }),
    Notification.deleteMany({ caseId }),
  ]);
  const deletion = await Case.deleteOne({ _id: caseId });
  if (deletion.deletedCount !== 1) {
    throw new Error("The case record was not deleted.");
  }
}

export async function purgeExpiredCases(retentionDays: number) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error("Case retention days must be a positive integer.");
  }
  const expiresBefore = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000,
  );
  let deletedCount = 0;
  for (;;) {
    const expiredCases = await Case.find({ createdAt: { $lt: expiresBefore } })
      .select("_id")
      .limit(100)
      .lean()
      .exec();
    if (!expiredCases.length) return deletedCount;
    for (const expiredCase of expiredCases) {
      await deleteCaseData(expiredCase._id);
      deletedCount += 1;
    }
  }
}

export function startRetentionCleanup(retentionDays: number) {
  const run = async () => {
    try {
      const deletedCount = await purgeExpiredCases(retentionDays);
      if (deletedCount) {
        console.info(`Retention cleanup permanently deleted ${deletedCount} expired case(s).`);
      }
    } catch (error) {
      console.error(
        "Retention cleanup failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };
  void run();
  return setInterval(() => void run(), 24 * 60 * 60 * 1000);
}
