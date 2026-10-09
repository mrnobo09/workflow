import type { IncomingMessage } from "node:http";
import { parseCookie } from "cookie";
import { config } from "../config.js";
import type { PublicAccount } from "../types/user.js";
import { accountFromAccessToken } from "./session.js";

type AudioSocketAuth =
    | { account: PublicAccount }
    | { error: { code: number; message: string } };

export async function authorizeAudioSocket(request: IncomingMessage): Promise<AudioSocketAuth> {
    if (request.headers.origin !== config.clientOrigin) {
        return { error: { code: 1008, message: "Origin not allowed" } };
    }

    const token = parseCookie(request.headers.cookie ?? "").access_token;
    const account = await accountFromAccessToken(token);
    if (!account) {
        return { error: { code: 1008, message: "Missing session" } };
    }
    if (account.accountType !== "user") {
        return { error: { code: 1008, message: "Only users can upload audio" } };
    }

    return { account };
}
