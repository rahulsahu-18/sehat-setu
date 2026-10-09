export type FollowUpLanguage = "english" | "hindi" | "odia";

const supportedLanguages = new Set<FollowUpLanguage>(["english", "hindi", "odia"]);

export function normalizeFollowUpLanguage(value: unknown): FollowUpLanguage {
  return typeof value === "string" && supportedLanguages.has(value as FollowUpLanguage)
    ? value as FollowUpLanguage
    : "english";
}

/**
 * Prefer the language/script the clinician actually used in the question. The
 * case language is only a fallback for empty/number-only questions; it must not
 * silently translate an English question into another language.
 */
export function detectFollowUpLanguage(
  question: string,
  fallback: unknown = "english",
): FollowUpLanguage {
  if (/[\u0B00-\u0B7F]/u.test(question)) return "odia";
  if (/[\u0900-\u097F]/u.test(question)) return "hindi";
  if (/[A-Za-z]/u.test(question)) return "english";
  return normalizeFollowUpLanguage(fallback);
}

export function languageDisplayName(language: FollowUpLanguage): string {
  switch (language) {
    case "hindi": return "Hindi";
    case "odia": return "Odia";
    default: return "English";
  }
}
