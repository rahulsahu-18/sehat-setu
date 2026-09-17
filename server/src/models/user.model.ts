import mongoose, { Document, Schema, Types } from "mongoose";

export enum UserRole {
  PATIENT = "PATIENT",
  DOCTOR = "DOCTOR",
  NURSE = "NURSE",
  FACILITY_ADMIN = "FACILITY_ADMIN",
}

export interface IUser extends Document {
  name: string;
  phoneNo: string;
  password?: string;
  role: UserRole;
  patientId?: string;
  email?: string;
  language?: string;
  facilityId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: false,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },

    patientId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    language: {
      type: String,
      default: "en",
    },

    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", userSchema);