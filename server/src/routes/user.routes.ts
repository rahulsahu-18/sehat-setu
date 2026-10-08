import { Router } from "express";
import { loginUser, registerPatient } from "../controller/user.controller";

const router: Router = Router();

router.post("/register", registerPatient);
router.post("/login", loginUser);

export default router;
