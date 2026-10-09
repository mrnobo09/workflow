import { UserModel } from "../models/user.js";
import { toPublicAccount } from "../services/auth/account.js";
import { verifyToken } from "../services/auth/tokens.js";
import type { PublicAccount } from "../types/user.js";

export async function accountFromAccessToken(token: string | undefined): Promise<PublicAccount | null> {
    if (!token) return null;

    try {
        const userId = verifyToken(token, "access");
        const user = await UserModel.findById(userId);
        if (!user) return null;
        return toPublicAccount(user);
    } catch {
        return null;
    }
}
