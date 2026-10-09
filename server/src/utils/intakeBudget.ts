export const MAX_AI_INTAKE_QUESTIONS = 10;

export type IntakeQuestionBudget = {
  used: number;
  remaining: number;
  exhausted: boolean;
};

/**
 * Counts distinct assistant question turns. The fingerprint includes the
 * patient answer that preceded the question, so a retry of the same answer
 * and response is counted once, while a repeated question after a new answer
 * still consumes question budget.
 */
export function getIntakeQuestionBudget(
  conversation: Array<{ role: string; content: string }>,
  maxQuestions = MAX_AI_INTAKE_QUESTIONS,
): IntakeQuestionBudget {
  const seen = new Set<string>();
  let precedingPatientAnswer = "";

  for (const turn of conversation) {
    if (turn.role === "user" && typeof turn.content === "string") {
      precedingPatientAnswer = turn.content.trim().replace(/\s+/g, " ").toLocaleLowerCase();
      continue;
    }
    if (turn.role !== "assistant" || typeof turn.content !== "string") continue;
    const content = turn.content.trim();
    if (!content || !/[?？؟]/.test(content)) continue;
    const normalizedQuestion = content.toLocaleLowerCase().replace(/\s+/g, " ").trim();
    seen.add(`${precedingPatientAnswer}\u0000${normalizedQuestion}`);
  }

  const used = Math.min(seen.size, maxQuestions);
  return {
    used,
    remaining: Math.max(0, maxQuestions - used),
    exhausted: used >= maxQuestions,
  };
}
