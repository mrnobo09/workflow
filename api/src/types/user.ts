import type { InferSchemaType } from "mongoose";
import { userSchema } from "../models/user.js";

export type UserRecord = InferSchemaType<typeof userSchema>;

export type AccountType = "user" | "worker" | "manager";

export type PublicAccount = {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    accountType: AccountType;
    specialty?: string;
};

export type SessionAccount = PublicAccount & { companyName: string };
