import mongoose, { Document, Schema } from "mongoose";

export enum FacilityType {
  GOVERNMENT_HOSPITAL = "GOVERNMENT_HOSPITAL",
  PHC = "PHC",
  CAMPUS_HEALTH_CENTER = "CAMPUS_HEALTH_CENTER",
  COMPANY_CLINIC = "COMPANY_CLINIC",
  INDUSTRIAL_HEALTH_UNIT = "INDUSTRIAL_HEALTH_UNIT",
  PUBLIC_HEALTH_CAMP = "PUBLIC_HEALTH_CAMP",
}

export interface IFacility extends Document {
  name: string;
  type: FacilityType;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

const facilitySchema = new Schema<IFacility>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: Object.values(FacilityType),
      required: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Facility = mongoose.model<IFacility>(
  "Facility",
  facilitySchema
);