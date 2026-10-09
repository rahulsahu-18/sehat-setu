export const MAX_AI_INTAKE_QUESTIONS = 10;

export type IntakeQuestionBudget = {
  used: number;
  remaining: number;
  exhausted: boolean;
  overLimit: boolean;
};

/**
 * Counts question marks in distinct assistant turns. The fingerprint includes
 * the preceding patient response so an identical answer/question pair caused
 * by a retry is counted once, while repeated wording after a new answer counts
 * again. This remains a text-based guard; mutation idempotency needs stable IDs.
 */
export function getIntakeQuestionBudget(
  conversation: Array<{ role: string; content: string }>,
  maxQuestions = MAX_AI_INTAKE_QUESTIONS,
): IntakeQuestionBudget {
  const seen = new Map<string, number>();
  let precedingPatientAnswer = "";

  for (const turn of conversation) {
    if (turn.role === "user" && typeof turn.content === "string") {
      precedingPatientAnswer = turn.content.trim().replace(/\s+/g, " ").toLocaleLowerCase();
      continue;
    }
    if (turn.role !== "assistant" || typeof turn.content !== "string") continue;
    const content = turn.content.trim();
    const count = content.match(/[?？؟]/g)?.length ?? 0;
    if (!content || count === 0) continue;
    const normalizedQuestion = content.toLocaleLowerCase().replace(/\s+/g, " ").trim();
    const key = `${precedingPatientAnswer}\u0000${normalizedQuestion}`;
    if (!seen.has(key)) seen.set(key, count);
  }

  const rawCount = [...seen.values()].reduce((total, count) => total + count, 0);
  const used = Math.min(rawCount, maxQuestions);
  return {
    used,
    remaining: Math.max(0, maxQuestions - rawCount),
    exhausted: rawCount >= maxQuestions,
    overLimit: rawCount > maxQuestions,
  };
}

function normalizeQuestionText(value: string) {
  return value.toLocaleLowerCase().replace(/[?.!,،؟？]+/g, "").replace(/\s+/g, " ").trim();
}

/** Excludes exact staff-authored questions from the initial AI intake budget. */
export function excludeStaffAuthoredQuestions<T extends { role: string; content: string }>(
  conversation: T[],
  staffQuestions: string[],
): T[] {
  const normalizedStaffQuestions = new Set(staffQuestions.map(normalizeQuestionText));
  if (normalizedStaffQuestions.size === 0) return conversation;
  return conversation.filter(
    (turn) =>
      turn.role !== "assistant" ||
      !normalizedStaffQuestions.has(normalizeQuestionText(turn.content)),
  );
}
