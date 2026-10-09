export const MAX_AI_INTAKE_QUESTIONS = 10;

export type IntakeQuestionBudget = {
  used: number;
  remaining: number;
  exhausted: boolean;
};

/**
 * Counts only assistant turns that are phrased as questions. A repeated
 * question string is counted once so retrying a request cannot consume the
 * budget twice. This is a safety guard, not a substitute for clinical review.
 */
export function getIntakeQuestionBudget(
  conversation: Array<{ role: string; content: string }>,
  maxQuestions = MAX_AI_INTAKE_QUESTIONS,
): IntakeQuestionBudget {
  const seen = new Set<string>();
  for (const turn of conversation) {
    if (turn.role !== "assistant" || typeof turn.content !== "string") continue;
    const content = turn.content.trim();
    if (!content || !/[?？]\s*$/.test(content)) continue;
    const normalized = content.toLocaleLowerCase().replace(/\s+/g, " ").trim();
    seen.add(normalized);
  }
  const used = Math.min(seen.size, maxQuestions);
  return { used, remaining: Math.max(0, maxQuestions - used), exhausted: used >= maxQuestions };
}
