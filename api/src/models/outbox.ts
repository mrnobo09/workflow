import { Schema, model } from "mongoose";

export const OUTBOX_TYPES = [
    "IMPORT_COMPLETED",
    "IMPORT_FAILED",
    "JOB_CREATED",
    "JOB_ASSIGNED",
    "JOB_STARTED",
    "JOB_COMPLETED",
] as const;

export const outboxSchema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
        recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: OUTBOX_TYPES, required: true },
        jobId: { type: Schema.Types.ObjectId, ref: "Job" },
        audioImportId: { type: Schema.Types.ObjectId, ref: "AudioImport" },
        message: { type: String, required: true },
        // Set by the job change stream so a replayed change event writes no second row.
        dedupeKey: String,
        status: { type: String, enum: ["pending", "published"], default: "pending" },
        attempts: { type: Number, default: 0 },
        nextAttemptAt: { type: Date, default: Date.now },
        lastError: String,
    },
    { timestamps: true },
);

outboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
outboxSchema.index(
    { dedupeKey: 1 },
    { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } },
);

export const OutboxModel = model("Outbox", outboxSchema);
