import { CaseStatus } from "../models/case.model";
import { DecisionAction } from "../models/decision.model";

const allowedTransitions: Record<CaseStatus, CaseStatus[]> = {
  [CaseStatus.NEW]: [
    CaseStatus.AI_PROCESSING,
    CaseStatus.WAITING_FOR_REVIEW,
    CaseStatus.ESCALATED,
  ],
  [CaseStatus.AI_PROCESSING]: [
    CaseStatus.WAITING_FOR_REVIEW,
    CaseStatus.WAITING_FOR_PATIENT,
    CaseStatus.ESCALATED,
  ],
  [CaseStatus.WAITING_FOR_REVIEW]: [
    CaseStatus.WAITING_FOR_PATIENT,
    CaseStatus.FINAL_REVIEW,
    CaseStatus.ACTIVE,
    CaseStatus.FOLLOW_UP,
    CaseStatus.REFERRED,
    CaseStatus.ESCALATED,
    CaseStatus.COMPLETED,
  ],
  [CaseStatus.WAITING_FOR_PATIENT]: [
    CaseStatus.AI_PROCESSING,
    CaseStatus.WAITING_FOR_REVIEW,
    CaseStatus.FINAL_REVIEW,
    CaseStatus.ACTIVE,
    CaseStatus.FOLLOW_UP,
    CaseStatus.REFERRED,
    CaseStatus.ESCALATED,
    CaseStatus.COMPLETED,
  ],
  [CaseStatus.FINAL_REVIEW]: [
    CaseStatus.ACTIVE,
    CaseStatus.FOLLOW_UP,
    CaseStatus.REFERRED,
    CaseStatus.ESCALATED,
    CaseStatus.COMPLETED,
  ],
  [CaseStatus.ACTIVE]: [
    CaseStatus.FOLLOW_UP,
    CaseStatus.REFERRED,
    CaseStatus.ESCALATED,
    CaseStatus.COMPLETED,
  ],
  [CaseStatus.FOLLOW_UP]: [
    CaseStatus.WAITING_FOR_REVIEW,
    CaseStatus.ACTIVE,
    CaseStatus.REFERRED,
    CaseStatus.ESCALATED,
    CaseStatus.COMPLETED,
  ],
  [CaseStatus.REFERRED]: [
    CaseStatus.FOLLOW_UP,
    CaseStatus.ACTIVE,
    CaseStatus.ESCALATED,
    CaseStatus.COMPLETED,
  ],
  [CaseStatus.ESCALATED]: [
    CaseStatus.FINAL_REVIEW,
    CaseStatus.ACTIVE,
    CaseStatus.REFERRED,
    CaseStatus.COMPLETED,
  ],
  [CaseStatus.COMPLETED]: [],
};

export function isAllowedStatusTransition(from: CaseStatus, to: CaseStatus) {
  if (from === to) return from !== CaseStatus.COMPLETED;
  return allowedTransitions[from]?.includes(to) ?? false;
}

export function statusForDecision(action: DecisionAction): CaseStatus {
  switch (action) {
    case DecisionAction.COMPLETE_CASE:
      return CaseStatus.COMPLETED;
    case DecisionAction.CONTINUE_EVALUATION:
      return CaseStatus.ACTIVE;
    case DecisionAction.SCHEDULE_FOLLOW_UP:
      return CaseStatus.FOLLOW_UP;
    case DecisionAction.REFER_TO_DOCTOR:
    case DecisionAction.REFER_TO_SPECIALIST:
      return CaseStatus.REFERRED;
    case DecisionAction.ESCALATE:
      return CaseStatus.ESCALATED;
  }
}

export function staffCanServeCase(
  staffFacilityId: unknown,
  caseFacilityId: unknown,
) {
  return String(staffFacilityId ?? "") === String(caseFacilityId ?? "");
}

export function isAssignableStaffRole(role: unknown) {
  return role === "DOCTOR" || role === "NURSE";
}
