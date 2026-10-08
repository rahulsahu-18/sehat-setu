import { Types } from "mongoose";
import { Case, CasePriority, CaseStatus } from "../models/case.model";

export type CaseAuditEvent = {
  action: string;
  actorId: Types.ObjectId;
  timestamp: Date;
  fromStatus?: CaseStatus;
  toStatus?: CaseStatus;
  fromPriority?: CasePriority;
  toPriority?: CasePriority;
  assignedToId?: Types.ObjectId;
};

export async function appendCaseAudit(
  caseId: Types.ObjectId,
  event: CaseAuditEvent,
) {
  await Case.updateOne(
    { _id: caseId },
    { $push: { auditTrail: { $each: [event], $slice: -200 } } },
  );
}
