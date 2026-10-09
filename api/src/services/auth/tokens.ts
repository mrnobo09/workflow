import jwt from "jsonwebtoken";
import { config } from "../../config.js";

type TokenType = "access" | "refresh";

function secret() {
    if (!config.jwtSecret) {
        throw new Error("JWT_SECRET is not set");
    }
    return config.jwtSecret;
}

export function signAccessToken(userId: string) {
    return jwt.sign({ sub: userId, type: "access" }, secret(), { expiresIn: config.accessTokenTtlSeconds });
}

export function signRefreshToken(userId: string) {
    return jwt.sign({ sub: userId, type: "refresh" }, secret(), { expiresIn: config.refreshTokenTtlSeconds });
}

export function tokenExpiresAt(token: string) {
    const payload = jwt.decode(token);
    if (!payload || typeof payload === "string" || typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
}

export function verifyToken(token: string, expected: TokenType) {
    const payload = jwt.verify(token, secret());
    if (typeof payload === "string" || payload.sub === undefined || payload.type !== expected) {
        throw new Error("Invalid token");
    }
    return payload.sub;
}
