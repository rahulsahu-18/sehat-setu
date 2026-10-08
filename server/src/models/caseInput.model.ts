import mongoose, { Document, Schema, Types } from "mongoose";

export enum InputMode {
  TEXT = "TEXT",
  VOICE = "VOICE",
  DOCUMENT = "DOCUMENT",
  IMAGE = "IMAGE",
}

export interface ICaseInput extends Document {
  caseId: Types.ObjectId;
  mode: InputMode;
  content: string;
  language?: string;
  sourceName?: string;
  createdAt: Date;
}

const caseInputSchema = new Schema<ICaseInput>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },

    mode: {
      type: String,
      enum: Object.values(InputMode),
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    language: {
      type: String,
    },

    sourceName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
  },
  {
    timestamps: true,
  }
);

caseInputSchema.index({ caseId: 1 });

export const CaseInput = mongoose.model<ICaseInput>(
  "CaseInput",
  caseInputSchema
);