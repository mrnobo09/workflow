import { Schema, model } from "mongoose";
import { OUTBOX_TYPES } from "./outbox.js";

export const notificationSchema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
        recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        eventId: { type: Schema.Types.ObjectId, ref: "Outbox", required: true },
        type: { type: String, enum: OUTBOX_TYPES, required: true },
        jobId: { type: Schema.Types.ObjectId, ref: "Job" },
        message: { type: String, required: true },
        readAt: { type: Date, default: null },
    },
    { timestamps: true },
);

notificationSchema.index({ eventId: 1 }, { unique: true });
notificationSchema.index({ tenantId: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, recipientId: 1, _id: 1 });

export const NotificationModel = model("Notification", notificationSchema);
