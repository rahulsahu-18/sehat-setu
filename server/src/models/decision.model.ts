import mongoose, { Document, Schema, Types } from "mongoose";

export enum DecisionPriority {
  ROUTINE = "ROUTINE",
  PRIORITY = "PRIORITY",
  URGENT = "URGENT",
}

export enum DecisionAction {
  COMPLETE_CASE = "COMPLETE_CASE",
  CONTINUE_EVALUATION = "CONTINUE_EVALUATION",
  SCHEDULE_FOLLOW_UP = "SCHEDULE_FOLLOW_UP",
  REFER_TO_DOCTOR = "REFER_TO_DOCTOR",
  REFER_TO_SPECIALIST = "REFER_TO_SPECIALIST",
  ESCALATE = "ESCALATE",
}

export interface IDecision extends Document {
  caseId: Types.ObjectId;
  staffId: Types.ObjectId;

  priority: DecisionPriority;
  action: DecisionAction;

  guidance?: string;
  reason?: string;

  assignedToId?: Types.ObjectId;

  createdAt: Date;
}

const decisionSchema = new Schema<IDecision>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },

    staffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    priority: {
      type: String,
      enum: Object.values(DecisionPriority),
      required: true,
    },

    action: {
      type: String,
      enum: Object.values(DecisionAction),
      required: true,
    },

    guidance: {
      type: String,
      trim: true,
    },

    reason: {
      type: String,
      trim: true,
    },

    assignedToId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

decisionSchema.index({ caseId: 1 });

export const Decision = mongoose.model<IDecision>(
  "Decision",
  decisionSchema
);