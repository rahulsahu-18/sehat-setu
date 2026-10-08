import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAISummaryData {
  summary: string;
  missingInformation: string[];
  contradictions?: string[];
  timeline?: { when: string; event: string; source: string }[];
  urgencySignals: {
    signal: string;
    confidence?: string;
    source?: string;
  }[];
  deterministicSafetyFlags?: {
    ruleId: string;
    status: "POSSIBLY_PRESENT" | "UNCERTAIN" | "CONFLICTING_REPORTS";
    reportedTerm: string;
    reason: string;
    instruction: string;
    reviewRequired: true;
  }[];
  conversation?: { role: "user" | "assistant"; content: string }[];
  conversationSource?: string;
  followUpQuestions?: string[];
  followUpQuestion?: string | null;
  complete?: boolean;

  [key: string]: unknown;
}

export interface IAISummary extends Document {
  caseId: Types.ObjectId;
  version: number;
  data: IAISummaryData;
  createdAt: Date;
}

const aiSummarySchema = new Schema<IAISummary>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },

    version: {
      type: Number,
      required: true,
    },

    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

aiSummarySchema.index({ caseId: 1, version: 1 }, { unique: true });

export const AISummary = mongoose.model<IAISummary>(
  "AISummary",
  aiSummarySchema,
);
