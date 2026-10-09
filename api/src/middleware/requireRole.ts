import type { NextFunction, Request, Response } from "express";
import type { AccountType } from "../types/user.js";

export function requireRole(...roles: AccountType[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const account = req.account;
        if (!account) {
            return res.status(401).json({ error: "Missing session" });
        }
        if (!roles.includes(account.accountType)) {
            return res.status(403).json({ error: "Your role cannot do this" });
        }
        next();
    };
}
