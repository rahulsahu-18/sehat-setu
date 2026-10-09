import type { Response } from "express";
import { Types } from "mongoose";
import type { AuthRequest } from "../middleware/auth.middleware";
import { Notification } from "../models/notification.model";

export async function listNotifications(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  const limitRaw = Number(req.query.limit || 30);
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;
  const notifications = await Notification.find({ recipientId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("type title message caseId questionId readAt createdAt")
    .lean()
    .exec();
  return res.status(200).json({
    success: true,
    data: {
      items: notifications,
      unreadCount: notifications.filter((item) => !item.readAt).length,
    },
  });
}

export async function markNotificationRead(req: AuthRequest, res: Response) {
  const userId = req.user?.userId;
  const notificationId = req.params.notificationId;
  if (!userId || !Types.ObjectId.isValid(userId) || typeof notificationId !== "string" || !Types.ObjectId.isValid(notificationId)) {
    return res.status(400).json({ success: false, message: "Invalid notification reference" });
  }
  const notification = await Notification.findOneAndUpdate(
    { _id: new Types.ObjectId(notificationId), recipientId: new Types.ObjectId(userId) },
    { $set: { readAt: new Date() } },
    { new: true },
  ).select("readAt");
  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }
  return res.status(200).json({ success: true, data: { readAt: notification.readAt } });
}
