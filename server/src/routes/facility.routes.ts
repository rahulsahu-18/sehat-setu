import { Router } from "express";
import {
  loginFacilityAdmin,
  registerFacility,
  getFacilities,
} from "../controller/facility.controller";

const router: Router = Router();

router.post("/register", registerFacility);
router.post("/login", loginFacilityAdmin);
router.get("/", getFacilities);

export default router;
