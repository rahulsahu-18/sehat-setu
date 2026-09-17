import mongoose, {
  Document,
  Schema,
  Types,
} from "mongoose";

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

    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

caseSchema.index({ facilityId: 1, status: 1 });
caseSchema.index({ assignedStaffId: 1, status: 1 });
caseSchema.index({ patientId: 1 });

export const Case = mongoose.model<ICase>("Case", caseSchema);