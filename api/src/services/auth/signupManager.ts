import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { TenantModel } from "../../models/tenant.js";
import { UserModel } from "../../models/user.js";
import { isDuplicateKey, type ManagerSignupInput } from "../../schemas/company.js";
import { toPublicAccount } from "./account.js";

export class SignupError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
    }
}

function readSignup(body: unknown): ManagerSignupInput {
    if (!body || typeof body !== "object") {
        throw new SignupError(400, "Company name, your name, email, and password are required");
    }
    const { companyName, name, email, password } = body as Record<string, unknown>;
    if (typeof companyName !== "string" || companyName.trim() === "") {
        throw new SignupError(400, "Company name is required");
    }
    if (typeof name !== "string" || name.trim() === "") {
        throw new SignupError(400, "Your name is required");
    }
    if (typeof email !== "string" || !email.includes("@")) {
        throw new SignupError(400, "A valid email is required");
    }
    if (typeof password !== "string" || password.length < 8) {
        throw new SignupError(400, "Password must be at least 8 characters");
    }
    return {
        companyName: companyName.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
    };
}

export async function signupManager(body: unknown) {
    const input = readSignup(body);
    const passwordHash = await bcrypt.hash(input.password, 10);

    const session = await mongoose.startSession();
    try {
        let account: ReturnType<typeof toPublicAccount> | undefined;
        await session.withTransaction(async () => {
            const [tenant] = await TenantModel.create([{ name: input.companyName }], { session });
            const [manager] = await UserModel.create([{
                tenantId: tenant?._id,
                name: input.name,
                email: input.email,
                passwordHash,
                // Public signup only ever creates the company's manager.
                accountType: "manager",
            }], { session });
            if (manager) account = toPublicAccount(manager);
        });
        if (!account) throw new SignupError(500, "Could not create the company");
        return account;
    } catch (error) {
        if (isDuplicateKey(error)) throw new SignupError(409, "An account with that email already exists");
        throw error;
    } finally {
        await session.endSession();
    }
}
