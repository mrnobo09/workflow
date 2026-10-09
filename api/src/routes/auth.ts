import { Router } from "express";
import { requireAccount } from "../middleware/requireAccount.js";
import { UserModel } from "../models/user.js";
import { toPublicAccount, withCompany } from "../services/auth/account.js";
import { clearAuthCookies, setAuthCookies } from "../services/auth/cookies.js";
import { login } from "../services/auth/login.js";
import { SignupError, signupManager } from "../services/auth/signupManager.js";
import { verifyToken } from "../services/auth/tokens.js";

const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
    try {
        const manager = await signupManager(req.body);
        setAuthCookies(res, manager.id);
        return res.status(201).json({ user: await withCompany(manager) });
    } catch (error) {
        if (error instanceof SignupError) return res.status(error.status).json({ error: error.message });
        return res.status(500).json({ error: "Could not create the company" });
    }
});

authRouter.post("/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const user = await login(email, password);
        setAuthCookies(res, user.id);
        return res.status(200).json({ user: await withCompany(user) });
    } catch {
        return res.status(401).json({ error: "Invalid credentials" });
    }
});

authRouter.post("/refresh", async (req, res) => {
    const token = req.cookies?.refresh_token;
    if (typeof token !== "string" || token === "") {
        return res.status(401).json({ error: "Missing session" });
    }

    try {
        const userId = verifyToken(token, "refresh");
        const user = await UserModel.findById(userId);
        if (!user) {
            clearAuthCookies(res);
            return res.status(401).json({ error: "Invalid session" });
        }
        setAuthCookies(res, user._id.toString());
        return res.status(200).json({ user: await withCompany(toPublicAccount(user)) });
    } catch {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Invalid session" });
    }
});

authRouter.post("/logout", (_req, res) => {
    clearAuthCookies(res);
    return res.status(204).send();
});

authRouter.get("/me", requireAccount, async (req, res) => {
    if (!req.account) return res.status(401).json({ error: "Missing session" });
    return res.json(await withCompany(req.account));
});

export default authRouter;
