import mongoose from "mongoose";

interface PatientSchema {
    name:string;
    gender:string;
    phoneNo:string;
    language:"odia" | "english" | "hindi";
}
const patientSchema = new mongoose.Schema<PatientSchema>(
     {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      required: true,
    },
    phoneNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    language: {
      type: String,
      enum: ["odia", "english", "hindi"],
      required: true,
    },
  },
  { timestamps: true }
);

export const patientModel = mongoose.model("patient",patientSchema);