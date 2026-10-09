import { QuestionStatus } from "../models/question.model";

const allowedTransitions: Record<QuestionStatus, QuestionStatus[]> = {
  [QuestionStatus.PENDING]: [
    QuestionStatus.APPROVED,
    QuestionStatus.REJECTED,
    QuestionStatus.CANCELLED,
  ],
  [QuestionStatus.APPROVED]: [QuestionStatus.SENT, QuestionStatus.CANCELLED],
  [QuestionStatus.SENT]: [QuestionStatus.IN_PROGRESS, QuestionStatus.CANCELLED],
  [QuestionStatus.IN_PROGRESS]: [QuestionStatus.ANSWERED, QuestionStatus.CANCELLED],
  [QuestionStatus.ANSWERED]: [QuestionStatus.REVIEWED],
  [QuestionStatus.REVIEWED]: [],
  [QuestionStatus.REJECTED]: [],
  [QuestionStatus.CANCELLED]: [],
};

export function isAllowedFollowUpTransition(from: QuestionStatus, to: QuestionStatus) {
  if (from === to) return from === QuestionStatus.IN_PROGRESS;
  return allowedTransitions[from]?.includes(to) ?? false;
}
