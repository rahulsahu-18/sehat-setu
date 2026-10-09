import { Router } from "express";
import { listNotifications, markNotificationRead } from "../controller/notification.controller";
import { protect } from "../middleware/auth.middleware";

const router: Router = Router();
router.get("/", protect, listNotifications);
router.patch("/:notificationId/read", protect, markNotificationRead);
export default router;
