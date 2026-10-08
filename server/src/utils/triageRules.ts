export type SafetyFlag = {
  ruleId: string;
  status: "POSSIBLY_PRESENT" | "UNCERTAIN" | "CONFLICTING_REPORTS";
  reportedTerm: string;
  reason: string;
  instruction: string;
  reviewRequired: true;
};

type WarningRule = {
  id: string;
  terms: RegExp[];
  reason: string;
};

const warningRules: WarningRule[] = [
  {
    id: "breathing-emergency-words",
    terms: [
      /severe trouble breathing/gi,
      /difficulty breathing/gi,
      /struggling to breathe/gi,
      /cannot breathe/gi,
      /can't breathe/gi,
      /unable to breathe/gi,
      /सांस लेने में दिक्कत/gi,
      /साँस लेने में दिक्कत/gi,
      /ଶ୍ୱାସ ନେବାରେ କଷ୍ଟ/gi,
      /ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ/gi,
    ],
    reason:
      "The patient text contains wording about severe or difficult breathing.",
  },
  {
    id: "unresponsive-emergency-words",
    terms: [
      /unconscious/gi,
      /unresponsive/gi,
      /not waking up/gi,
      /cannot be woken/gi,
      /बेहोश/gi,
      /होश नहीं/gi,
      /ଅଚେତ/gi,
      /ଚେତାଶୂନ୍ୟ/gi,
    ],
    reason:
      "The patient text contains wording about unresponsiveness or inability to wake.",
  },
  {
    id: "heavy-bleeding-words",
    terms: [
      /heavy bleeding/gi,
      /bleeding heavily/gi,
      /bleeding won't stop/gi,
      /bleeding will not stop/gi,
      /बहुत खून बह रहा/gi,
      /खून बहना बंद नहीं/gi,
      /ପ୍ରବଳ ରକ୍ତସ୍ରାବ/gi,
      /ରକ୍ତସ୍ରାବ ବନ୍ଦ ହେଉନି/gi,
    ],
    reason:
      "The patient text contains wording about heavy or ongoing bleeding.",
  },
  {
    id: "stroke-warning-words",
    terms: [
      /face drooping/gi,
      /one side weakness/gi,
      /sudden weakness on one side/gi,
      /sudden trouble speaking/gi,
      /slurred speech/gi,
      /चेहरा टेढ़ा/gi,
      /एक तरफ अचानक कमजोरी/gi,
      /अचानक बोलने में दिक्कत/gi,
      /ମୁହଁ ବଙ୍କା/gi,
      /ଗୋଟିଏ ପଟେ ହଠାତ୍ ଦୁର୍ବଳତା/gi,
      /ହଠାତ୍ କଥା କହିବାରେ ଅସୁବିଧା/gi,
    ],
    reason:
      "The patient text contains wording associated with a possible sudden neurological emergency.",
  },
];

const negation =
  /\b(no|not|never|without|denies|don't have|do not have|isn't|is not)\b|नहीं|नही|ବିନା|ନାହିଁ/iu;
const uncertainty =
  /\b(maybe|might|possibly|could be|not sure|unsure|uncertain|think i have|seems like|don't think|do not think)\b|शायद|हो सकता|पक्का नहीं|ହୁଏତ|ହୋଇପାରେ/iu;

function hasNegationBefore(text: string, matchIndex: number) {
  const beginning = Math.max(
    text.lastIndexOf(".", matchIndex),
    text.lastIndexOf("!", matchIndex),
    text.lastIndexOf("?", matchIndex),
    text.lastIndexOf(";", matchIndex),
    text.lastIndexOf("।", matchIndex),
    text.lastIndexOf("but", matchIndex),
    text.lastIndexOf("however", matchIndex),
    text.lastIndexOf("लेकिन", matchIndex),
    text.lastIndexOf("କିନ୍ତୁ", matchIndex),
  );
  const nearby = text.slice(
    Math.max(0, beginning, matchIndex - 48),
    matchIndex,
  );
  return negation.test(nearby);
}

function hasUncertainty(text: string, matchIndex: number) {
  const nearby = text.slice(Math.max(0, matchIndex - 64), matchIndex + 80);
  return uncertainty.test(nearby);
}

function hasNegationAfter(
  text: string,
  matchIndex: number,
  matchLength: number,
) {
  const nearby = text.slice(
    matchIndex + matchLength,
    matchIndex + matchLength + 32,
  );
  return /\b(not|never|isn't|is not)\b|नहीं|नही|ନାହିଁ/iu.test(nearby);
}

export function evaluateSafetyFlags(
  patientReports: string[],
  language = "english",
): SafetyFlag[] {
  const found = new Map<
    string,
    { term: string; statuses: Set<string>; reason: string }
  >();

  for (const rule of warningRules) {
    const statuses = new Set<string>();
    let reportedTerm = "";

    for (const report of patientReports) {
      if (typeof report !== "string") continue;
      for (const termPattern of rule.terms) {
        const pattern = new RegExp(termPattern.source, "gi");
        for (const match of report.matchAll(pattern)) {
          const index = match.index ?? 0;
          reportedTerm = match[0];
          if (hasUncertainty(report, index)) {
            statuses.add("UNCERTAIN");
          } else if (
            hasNegationBefore(report, index) ||
            hasNegationAfter(report, index, match[0].length)
          ) {
            statuses.add("NEGATED");
          } else {
            statuses.add("POSSIBLY_PRESENT");
          }
        }
      }
    }

    if (statuses.has("POSSIBLY_PRESENT") && statuses.has("NEGATED")) {
      found.set(rule.id, {
        term: reportedTerm,
        statuses: new Set(["CONFLICTING_REPORTS"]),
        reason: `${rule.reason} Patient reports include both a mention and a negation; clarify directly.`,
      });
    } else if (statuses.has("POSSIBLY_PRESENT")) {
      found.set(rule.id, { term: reportedTerm, statuses, reason: rule.reason });
    } else if (statuses.has("UNCERTAIN")) {
      found.set(rule.id, {
        term: reportedTerm,
        statuses,
        reason: `${rule.reason} The patient expressed uncertainty; clarify directly.`,
      });
    }
  }

  return [...found.entries()].map(([ruleId, value]) => {
    const status = value.statuses.has("CONFLICTING_REPORTS")
      ? "CONFLICTING_REPORTS"
      : value.statuses.has("UNCERTAIN")
        ? "UNCERTAIN"
        : "POSSIBLY_PRESENT";
    return {
      ruleId,
      status,
      reportedTerm: value.term,
      reason: value.reason,
      instruction:
        language === "hindi"
          ? "संभावित आपातकालीन चेतावनी: इस चैट का इंतज़ार न करें। सुविधा की आपातकालीन प्रक्रिया का पालन करें या तुरंत योग्य स्वास्थ्यकर्मी से मूल्यांकन कराएं।"
          : language === "odia"
            ? "ସମ୍ଭାବ୍ୟ ଜରୁରୀ ସତର୍କତା: ଏହି ଚାଟ୍ ପାଇଁ ଅପେକ୍ଷା କରନ୍ତୁ ନାହିଁ। ସୁବିଧାର ଜରୁରୀ ପ୍ରୋଟୋକଲ୍ ଅନୁସରଣ କରନ୍ତୁ କିମ୍ବା ତୁରନ୍ତ ଯୋଗ୍ୟ ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀଙ୍କ ମୂଲ୍ୟାଙ୍କନ ନିଅନ୍ତୁ।"
            : "Possible emergency warning: do not wait for this chat. Follow the facility emergency protocol or seek immediate assessment by a qualified professional.",
      reviewRequired: true,
    };
  });
}
