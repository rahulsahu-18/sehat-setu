import mongoose, { Document, Schema, Types } from "mongoose";

export enum AnswerMode {
  TEXT = "TEXT",
  VOICE = "VOICE",
}

export interface IAnswer extends Document {
  questionId: Types.ObjectId;
  answer: string;
  mode: AnswerMode;
  language?: "english" | "hindi" | "odia";
  englishSummary?: string;
  englishSummaryStatus?: "PENDING" | "READY" | "FAILED";
  idempotencyKey?: string;
  payloadHash?: string;
  submittedById?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<IAnswer>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    mode: {
      type: String,
      enum: Object.values(AnswerMode),
      default: AnswerMode.TEXT,
    },
    // Original answer stays in its transcribed language; English summary is a
    // separate clinician aid and must never overwrite the patient response.
    language: { type: String, enum: ["english", "hindi", "odia"] },
    englishSummary: { type: String, trim: true, maxlength: 1200 },
    englishSummaryStatus: {
      type: String,
      enum: ["PENDING", "READY", "FAILED"],
      default: "PENDING",
    },
    idempotencyKey: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    payloadHash: {
      type: String,
      maxlength: 64,
    },
    submittedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

answerSchema.index({ questionId: 1 });
// Older prototype answers without idempotency keys are excluded while new
// submissions are protected from duplicate answers for the same question.
answerSchema.index(
  { questionId: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
    name: "unique_idempotent_answer_per_follow_up",
  },
);

export const Answer = mongoose.model<IAnswer>("Answer", answerSchema);
