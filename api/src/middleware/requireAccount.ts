import type { NextFunction, Request, Response } from "express";
import type { PublicAccount } from "../types/user.js";
import { accountFromAccessToken } from "./session.js";

declare global {
    namespace Express {
        interface Request {
            account?: PublicAccount;
        }
    }
}

export async function requireAccount(req: Request, res: Response, next: NextFunction) {
    const account = await accountFromAccessToken(req.cookies?.access_token);
    if (!account) {
        return res.status(401).json({ error: "Missing session" });
    }

    req.account = account;
    next();
}
