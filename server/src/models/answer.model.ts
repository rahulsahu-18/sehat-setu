import mongoose, { Document, Schema, Types } from "mongoose";

export enum AnswerMode {
  TEXT = "TEXT",
  VOICE = "VOICE",
}

export interface IAnswer extends Document {
  questionId: Types.ObjectId;
  answer: string;
  mode: AnswerMode;
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
  { questionId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
    name: "unique_idempotency_key_per_follow_up",
  },
);

export const Answer = mongoose.model<IAnswer>("Answer", answerSchema);
