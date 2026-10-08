import mongoose, { Document, Schema, Types } from "mongoose";

export interface IReferralNote extends Document {
  caseId: Types.ObjectId;
  preparedById: Types.ObjectId;
  caseNo: string;
  patientName: string;
  patientId: string;
  caseStatus: string;
  priority: string;
  referringFacility: string;
  referringFacilityLocation: string;
  receivingFacility: string;
  clinicalQuestion: string;
  patientInstructions: string;
  patientSharedAt?: Date | null;
  patientSharedById?: Types.ObjectId | null;
  patientSummary: string;
  timeline: { when: string; event: string; source: string }[];
  reportSources: string[];
  warningFlags: string[];
  missingInformation: string[];
  contradictions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const referralNoteSchema = new Schema<IReferralNote>(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Case",
      required: true,
      unique: true,
    },
    preparedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    caseNo: { type: String, required: true, trim: true },
    patientName: { type: String, required: true, trim: true },
    patientId: { type: String, required: true, trim: true },
    caseStatus: { type: String, required: true, trim: true },
    priority: { type: String, required: true, trim: true },
    referringFacility: { type: String, required: true, trim: true },
    referringFacilityLocation: { type: String, trim: true, default: "" },
    receivingFacility: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    clinicalQuestion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    patientInstructions: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    patientSharedAt: { type: Date, default: null },
    patientSharedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    patientSummary: { type: String, trim: true, default: "" },
    timeline: {
      type: [
        new Schema(
          {
            when: { type: String, required: true },
            event: { type: String, required: true },
            source: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    reportSources: { type: [String], default: [] },
    warningFlags: { type: [String], default: [] },
    missingInformation: { type: [String], default: [] },
    contradictions: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const ReferralNote = mongoose.model<IReferralNote>(
  "ReferralNote",
  referralNoteSchema,
);
