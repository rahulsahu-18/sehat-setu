import { Types } from "mongoose";

export function patientOwnedCaseFilter(caseId: string, patientId: string) {
  if (!Types.ObjectId.isValid(caseId) || !Types.ObjectId.isValid(patientId)) {
    return null;
  }
  return {
    _id: new Types.ObjectId(caseId),
    patientId: new Types.ObjectId(patientId),
  };
}

export function facilityCaseFilter(caseId: string, facilityId: string) {
  if (!Types.ObjectId.isValid(caseId) || !Types.ObjectId.isValid(facilityId)) {
    return null;
  }
  return {
    _id: new Types.ObjectId(caseId),
    facilityId: new Types.ObjectId(facilityId),
  };
}
