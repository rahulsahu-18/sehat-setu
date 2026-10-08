import mongoose, { Document, Schema, Types } from "mongoose";

export enum CaseStatus {
  NEW = "NEW",
  AI_PROCESSING = "AI_PROCESSING",
  WAITING_FOR_REVIEW = "WAITING_FOR_REVIEW",
  WAITING_FOR_PATIENT = "WAITING_FOR_PATIENT",
  FINAL_REVIEW = "FINAL_REVIEW",
  ACTIVE = "ACTIVE",
  FOLLOW_UP = "FOLLOW_UP",
  REFERRED = "REFERRED",
  ESCALATED = "ESCALATED",
  COMPLETED = "COMPLETED",
}

export enum CasePriority {
  ROUTINE = "ROUTINE",
  PRIORITY = "PRIORITY",
  URGENT = "URGENT",
}

export interface ICase extends Document {
  caseNo: string;
  patientId: Types.ObjectId;
  facilityId: Types.ObjectId;
  assignedStaffId?: Types.ObjectId;
  status: CaseStatus;
  priority: CasePriority;
  intakeLanguage: "english" | "hindi" | "odia";
  consent?: {
    version: string;
    acceptedAt: Date;
  };
  auditTrail: {
    action: string;
    actorId: Types.ObjectId;
    timestamp: Date;
    fromStatus?: CaseStatus;
    toStatus?: CaseStatus;
    fromPriority?: CasePriority;
    toPriority?: CasePriority;
    assignedToId?: Types.ObjectId;
  }[];
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<ICase>(
  {
    caseNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },

    assignedStaffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    status: {
      type: String,
      enum: Object.values(CaseStatus),
      default: CaseStatus.NEW,
    },

    priority: {
      type: String,
      enum: Object.values(CasePriority),
      default: CasePriority.ROUTINE,
    },

    intakeLanguage: {
      type: String,
      enum: ["english", "hindi", "odia"],
      required: true,
    },

    consent: {
      version: { type: String, trim: true },
      acceptedAt: { type: Date },
    },

    auditTrail: {
      type: [
        new Schema(
          {
            action: { type: String, required: true, trim: true },
            actorId: {
              type: Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            timestamp: { type: Date, required: true },
            fromStatus: { type: String, enum: Object.values(CaseStatus) },
            toStatus: { type: String, enum: Object.values(CaseStatus) },
            fromPriority: { type: String, enum: Object.values(CasePriority) },
            toPriority: { type: String, enum: Object.values(CasePriority) },
            assignedToId: { type: Schema.Types.ObjectId, ref: "User" },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

caseSchema.index({ facilityId: 1, status: 1 });
caseSchema.index({ assignedStaffId: 1, status: 1 });
caseSchema.index({ patientId: 1 });

export const Case = mongoose.model<ICase>("Case", caseSchema);
