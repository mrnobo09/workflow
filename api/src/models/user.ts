import { Schema, model } from "mongoose";
import { SPECIALTIES } from "../schemas/specialties.js";

export const userSchema = new Schema(
    {
        tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        passwordHash: { type: String, required: true, select: false },
        accountType: { type: String, enum: ["user", "worker", "manager"], required: true },
        specialty: { type: String, enum: SPECIALTIES },
    },
    { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ tenantId: 1, accountType: 1, specialty: 1, createdAt: 1 });

export const UserModel = model("User", userSchema);
