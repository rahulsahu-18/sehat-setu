import mongoose, { Document, Schema, Types } from "mongoose";

export enum AnswerMode {
  TEXT = "TEXT",
  VOICE = "VOICE",
}

export interface IAnswer extends Document {
  questionId: Types.ObjectId;
  answer: string;
  mode: AnswerMode;
  createdAt: Date;
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
    },

    mode: {
      type: String,
      enum: Object.values(AnswerMode),
      default: AnswerMode.TEXT,
    },
  },
  {
    timestamps: true,
  }
);

answerSchema.index({ questionId: 1 });

export const Answer = mongoose.model<IAnswer>(
  "Answer",
  answerSchema
);