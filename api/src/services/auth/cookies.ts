import type { Response } from "express";
import { config } from "../../config.js";
import { signAccessToken, signRefreshToken } from "./tokens.js";

const secureCookie = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
};

export function setAuthCookies(res: Response, userId: string) {
    res.cookie("access_token", signAccessToken(userId), {
        ...secureCookie,
        path: "/",
        maxAge: config.accessTokenTtlSeconds * 1000,
    });
    res.cookie("refresh_token", signRefreshToken(userId), {
        ...secureCookie,
        path: "/auth",
        maxAge: config.refreshTokenTtlSeconds * 1000,
    });
}

export function clearAuthCookies(res: Response) {
    res.clearCookie("access_token", { ...secureCookie, path: "/" });
    res.clearCookie("refresh_token", { ...secureCookie, path: "/auth" });
}
