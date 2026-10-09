import { Schema, model } from "mongoose";
import { SPECIALTIES } from "../schemas/specialties.js";

export const jobSchema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
        audioImportId: { type: Schema.Types.ObjectId, ref: "AudioImport", required: true },
        description: { type: String, required: true },
        location: String,
        specialty: { type: String, enum: SPECIALTIES, required: true },
        requestedTimeText: String,
        sourceText: String,
        sourceChunk: { type: Number, required: true },
        sourceOrder: { type: Number, required: true },
        lastChangedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        status: {
            type: String,
            enum: ["draft", "assigned", "in_progress", "completed"],
            default: "draft",
        },
    },
    { timestamps: true },
);

jobSchema.index({ tenantId: 1, createdAt: -1, _id: -1 });
jobSchema.index({ tenantId: 1, specialty: 1, createdAt: -1, _id: -1 });
jobSchema.index({ tenantId: 1, createdBy: 1, createdAt: -1, _id: -1 });
jobSchema.index({ tenantId: 1, assignedTo: 1, createdAt: -1, _id: -1 });
jobSchema.index({ audioImportId: 1, sourceChunk: 1, sourceOrder: 1 }, { unique: true });

export const JobModel = model("Job", jobSchema);
