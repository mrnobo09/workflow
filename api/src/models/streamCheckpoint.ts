import { Schema, model } from "mongoose";

export const streamCheckpointSchema = new Schema(
    {
        _id: { type: String, required: true },
        resumeToken: { type: Schema.Types.Mixed, required: true },
    },
    { timestamps: true },
);

export const StreamCheckpointModel = model("StreamCheckpoint", streamCheckpointSchema);
