import { Router } from "express";
import { getVoiceAgentFollowUp } from "../controller/voiceAgent.controller";

const router = Router();
router.get("/follow-ups/:questionId", getVoiceAgentFollowUp);
export default router;
