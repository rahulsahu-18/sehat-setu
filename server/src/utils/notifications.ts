import { Types } from "mongoose";
import { Notification, NotificationType } from "../models/notification.model";
import { Case } from "../models/case.model";
import { User, UserRole } from "../models/user.model";

type NotificationInput = {
  recipientId: Types.ObjectId;
  actorId?: Types.ObjectId;
  caseId: Types.ObjectId;
  questionId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  dedupeKey: string;
};

export async function upsertNotification(input: NotificationInput) {
  return Notification.findOneAndUpdate(
    { dedupeKey: input.dedupeKey },
    { $setOnInsert: input },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();
}

export async function notifyPatientFollowUp(
  caseId: Types.ObjectId,
  questionId: Types.ObjectId,
  actorId: Types.ObjectId,
) {
  const caseRecord = await Case.findById(caseId).select("patientId");
  if (!caseRecord) return;
  await upsertNotification({
    recipientId: caseRecord.patientId,
    actorId,
    caseId,
    questionId,
    type: NotificationType.FOLLOW_UP_REQUESTED,
    title: "Your care team requested more information",
    message: "A follow-up question is waiting for your response.",
    dedupeKey: `follow-up-requested:${questionId.toString()}`,
  });
}

export async function notifyCareTeamAnswer(
  caseId: Types.ObjectId,
  questionId: Types.ObjectId,
  actorId: Types.ObjectId,
) {
  const caseRecord = await Case.findById(caseId).select("facilityId assignedStaffId");
  if (!caseRecord) return;
  let recipients: Types.ObjectId[] = [];
  if (caseRecord.assignedStaffId) {
    recipients = [caseRecord.assignedStaffId];
  } else {
    const staff = await User.find({
      facilityId: caseRecord.facilityId,
      role: { $in: [UserRole.DOCTOR, UserRole.NURSE] },
    }).select("_id").lean();
    recipients = staff.map((user) => user._id);
  }
  await Promise.all(recipients.map((recipientId) => upsertNotification({
    recipientId,
    actorId,
    caseId,
    questionId,
    type: NotificationType.FOLLOW_UP_ANSWERED,
    title: "A patient answered a follow-up",
    message: "A follow-up response is ready for clinical review.",
    dedupeKey: `follow-up-answered:${questionId.toString()}:${recipientId.toString()}`,
  })));
}


export async function notifyPatientCaseReview(
  caseId: Types.ObjectId,
  decisionId: Types.ObjectId,
  actorId: Types.ObjectId,
  completed: boolean,
) {
  const caseRecord = await Case.findById(caseId).select("patientId");
  if (!caseRecord) return;
  await upsertNotification({
    recipientId: caseRecord.patientId,
    actorId,
    caseId,
    type: NotificationType.CASE_REVIEW_UPDATED,
    title: completed ? "Your case review is complete" : "Your care team updated your case",
    message: "Your case status was updated. Sign in to view patient-visible information.",
    dedupeKey: "case-review:" + decisionId.toString(),
  });
}
