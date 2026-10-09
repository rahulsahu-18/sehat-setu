import mongoose, { Document, Schema, Types } from "mongoose";

export enum QuestionSource {
  AI = "AI",
  STAFF = "STAFF",
}

export enum QuestionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  SENT = "SENT",
  IN_PROGRESS = "IN_PROGRESS",
  ANSWERED = "ANSWERED",
  REVIEWED = "REVIEWED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export interface IQuestion extends Document {
  caseId: Types.ObjectId;
  question: string;
  source: QuestionSource;
  status: QuestionStatus;
  createdBy?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    source: {
      type: String,
      enum: Object.values(QuestionSource),
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(QuestionStatus),
      default: QuestionStatus.PENDING,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

questionSchema.index({ caseId: 1, status: 1 });

export const Question = mongoose.model<IQuestion>("Question", questionSchema);
