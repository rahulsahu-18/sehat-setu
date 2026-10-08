import mongoose, {
  Document,
  Schema,
  Types,
} from "mongoose";

import { UserRole } from "./user.model";

export enum ApplicationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export interface IStaffApplication extends Document {
  name: string;
  phoneNo: string;
  email?: string;
  password: string;

  role: UserRole.DOCTOR | UserRole.NURSE;

  facilityId: Types.ObjectId;

  status: ApplicationStatus;

  createdAt: Date;
  updatedAt: Date;
}

const staffApplicationSchema =
  new Schema<IStaffApplication>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      phoneNo: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        lowercase: true,
        trim: true,
      },

      password: {
        type: String,
        required: true,
      },

      role: {
        type: String,
        enum: [
          UserRole.DOCTOR,
          UserRole.NURSE,
        ],
        required: true,
      },

      facilityId: {
        type: Schema.Types.ObjectId,
        ref: "Facility",
        required: true,
      },

      status: {
        type: String,
        enum: Object.values(ApplicationStatus),
        default: ApplicationStatus.PENDING,
      },
    },
    {
      timestamps: true,
    }
  );

staffApplicationSchema.index({
  facilityId: 1,
  status: 1,
});

export const StaffApplication =
  mongoose.model<IStaffApplication>(
    "StaffApplication",
    staffApplicationSchema
  );