import { Schema, model } from "mongoose";

export const audioImportSchema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        storageKey: { type: String, required: true },
        transcriptKey: String,
        transcript: String,
        status: {
            type: String,
            enum: ["queued", "transcribing", "extracting", "completed", "failed"],
            default: "queued",
        },
        nextChunk: { type: Number, default: 0 },
        totalChunks: { type: Number, default: 0 },
        jobsCreated: { type: Number, default: 0 },
        lastError: String,
    },
    { timestamps: true },
);

export const AudioImportModel = model("AudioImport", audioImportSchema);
