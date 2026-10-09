import mongoose, { Document, Schema, Types } from "mongoose";

export enum NotificationType {
  FOLLOW_UP_REQUESTED = "FOLLOW_UP_REQUESTED",
  FOLLOW_UP_ANSWERED = "FOLLOW_UP_ANSWERED",
  CASE_REVIEW_UPDATED = "CASE_REVIEW_UPDATED",
}

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  actorId?: Types.ObjectId;
  caseId: Types.ObjectId;
  questionId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  dedupeKey: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    caseId: { type: Schema.Types.ObjectId, ref: "Case", required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question" },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 240 },
    dedupeKey: { type: String, required: true, unique: true, trim: true, maxlength: 200 },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
