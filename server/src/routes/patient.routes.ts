import { Router } from "express";
import { loginUser, registerPatient } from "../controller/user.controller";
import {
  addPatientIntakeInput,
  acceptPatientCaseConsent,
  deletePatientCase,
  deletePatientAccount,
  getPatientIntakeChat,
  getPatientCases,
  startPatientIntake,
} from "../controller/intake.controller";
import { patientOnly, protect } from "../middleware/auth.middleware";
import {
  processPatientReport,
  uploadPatientReport,
} from "../controller/report.controller";
import {
  transcribePatientIntakeVoice,
  uploadIntakeVoice,
} from "../controller/voice.controller";

const patientRouter: Router = Router();

patientRouter.post("/register", registerPatient);
patientRouter.post("/login", loginUser);
patientRouter.post("/intake", protect, patientOnly, startPatientIntake);
patientRouter.get("/cases", protect, patientOnly, getPatientCases);
patientRouter.delete("/cases/:caseId", protect, patientOnly, deletePatientCase);
patientRouter.delete("/account", protect, patientOnly, deletePatientAccount);
patientRouter.get(
  "/intake/:caseId/chat",
  protect,
  patientOnly,
  getPatientIntakeChat,
);
patientRouter.post(
  "/intake/:caseId/consent",
  protect,
  patientOnly,
  acceptPatientCaseConsent,
);
patientRouter.post(
  "/intake/:caseId/input",
  protect,
  patientOnly,
  addPatientIntakeInput,
);
patientRouter.post(
  "/intake/:caseId/voice",
  protect,
  patientOnly,
  uploadIntakeVoice,
  transcribePatientIntakeVoice,
);
patientRouter.post(
  "/intake/:caseId/reports",
  protect,
  patientOnly,
  uploadPatientReport,
  processPatientReport,
);

export default patientRouter;
