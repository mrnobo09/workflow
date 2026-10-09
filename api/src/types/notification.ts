import type { InferSchemaType } from "mongoose";
import { notificationSchema } from "../models/notification.js";

export type NotificationRecord = InferSchemaType<typeof notificationSchema>;
