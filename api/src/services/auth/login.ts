import bcrypt from "bcryptjs";
import { UserModel } from "../../models/user.js";
import { toPublicAccount } from "./account.js";

export async function login(email: string, password: string) {
    const user = await UserModel.findOne({ email }).select("+passwordHash");
    if (!user) {
        throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error("Invalid password");
    }

    return toPublicAccount(user);
}
