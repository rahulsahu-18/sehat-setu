import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAISummaryData {
  summary: string;

  missingInformation: string[];

  urgencySignals: {
    signal: string;
    confidence?: string;
    source?: string;
  }[];

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
  }
);

aiSummarySchema.index(
  { caseId: 1, version: 1 },
  { unique: true }
);

export const AISummary = mongoose.model<IAISummary>(
  "AISummary",
  aiSummarySchema
);