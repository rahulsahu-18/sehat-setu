import { Router } from "express";

import {
  applyAsStaff,
  loginStaff,
  getStaffApplications,
  acceptStaffApplication,
  rejectStaffApplication,
  getStaffCases,
} from "../controller/staff.controller";
import {
  assignStaffCase,
  assignFacilityCase,
  createStaffQuestions,
  getFacilityCaseAssignments,
  getStaffCaseDetail,
  getStaffTeam,
  reviewStaffQuestion,
  reviewStaffCase,
  saveStaffReferralNote,
  shareStaffReferralSlip,
  sendStaffQuestionBundle,
} from "../controller/caseReview.controller";

import {
  protect,
  facilityAdminOnly,
  healthcareStaffOnly,
} from "../middleware/auth.middleware";

const router: Router = Router();

// Staff
router.post("/apply", applyAsStaff);

router.post("/login", loginStaff);
router.get("/cases", protect, healthcareStaffOnly, getStaffCases);
router.get("/team", protect, healthcareStaffOnly, getStaffTeam);
router.get("/cases/:caseId", protect, healthcareStaffOnly, getStaffCaseDetail);
router.patch(
  "/cases/:caseId/assignment",
  protect,
  healthcareStaffOnly,
  assignStaffCase,
);
router.post(
  "/cases/:caseId/review",
  protect,
  healthcareStaffOnly,
  reviewStaffCase,
);
router.put(
  "/cases/:caseId/referral-note",
  protect,
  healthcareStaffOnly,
  saveStaffReferralNote,
);
router.post(
  "/cases/:caseId/referral-note/share",
  protect,
  healthcareStaffOnly,
  shareStaffReferralSlip,
);
router.post(
  "/cases/:caseId/questions/:questionId/review",
  protect,
  healthcareStaffOnly,
  reviewStaffQuestion,
);
router.post(
  "/cases/:caseId/questions",
  protect,
  healthcareStaffOnly,
  createStaffQuestions,
);
router.post(
  "/cases/:caseId/questions/send-approved",
  protect,
  healthcareStaffOnly,
  sendStaffQuestionBundle,
);

// Facility Admin
router.get(
  "/facility/case-assignments",
  protect,
  facilityAdminOnly,
  getFacilityCaseAssignments,
);
router.patch(
  "/facility/cases/:caseId/assignment",
  protect,
  facilityAdminOnly,
  assignFacilityCase,
);
router.get("/applications", protect, facilityAdminOnly, getStaffApplications);

router.patch(
  "/applications/:id/accept",
  protect,
  facilityAdminOnly,
  acceptStaffApplication,
);

router.patch(
  "/applications/:id/reject",
  protect,
  facilityAdminOnly,
  rejectStaffApplication,
);

export default router;
