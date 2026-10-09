import type { InferSchemaType } from "mongoose";
import { outboxSchema } from "../models/outbox.js";

export type OutboxRecord = InferSchemaType<typeof outboxSchema>;
