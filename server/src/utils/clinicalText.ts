/**
 * Safe display helpers for untrusted clinical text. These functions do not
 * diagnose, classify symptoms, or replace the configured clinical safety policy.
 */
export function normalizePatientText(value: unknown, maxLength = 4000): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\u0000/g, "").trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

export function isRepeatedTurn(
  existing: Array<{ role?: string; content?: string }>,
  role: "user" | "assistant",
  content: string,
): boolean {
  const normalized = content.trim().replace(/\s+/g, " ");
  return existing.some(
    (turn) =>
      turn.role === role &&
      typeof turn.content === "string" &&
      turn.content.trim().replace(/\s+/g, " ") === normalized,
  );
}
