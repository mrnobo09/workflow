import { Router } from "express";
import { requireAccount } from "../middleware/requireAccount.js";
import { requireRole } from "../middleware/requireRole.js";
import { UserModel } from "../models/user.js";
import { TeamError, createTeamMember, toMemberView } from "../services/team/createMember.js";

const teamRouter = Router();

teamRouter.use(requireAccount, requireRole("manager"));

teamRouter.get("/", async (req, res) => {
    if (!req.account) return res.status(401).json({ error: "Missing session" });
    const members = await UserModel.find({ tenantId: req.account.tenantId }).sort({ createdAt: 1 });
    return res.json({ members: members.map(toMemberView) });
});

teamRouter.post("/", async (req, res) => {
    if (!req.account) return res.status(401).json({ error: "Missing session" });
    try {
        const member = await createTeamMember(req.account, req.body);
        return res.status(201).json({ member });
    } catch (error) {
        if (error instanceof TeamError) return res.status(error.status).json({ error: error.message });
        return res.status(500).json({ error: "Could not add the person" });
    }
});

export default teamRouter;
