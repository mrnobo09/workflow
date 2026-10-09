import { Router } from "express";
import { requireAccount } from "../middleware/requireAccount.js";
import { requireRole } from "../middleware/requireRole.js";
import { UserModel } from "../models/user.js";

const workersRouter = Router();

workersRouter.get("/", requireAccount, requireRole("manager"), async (req, res) => {
    if (!req.account) return res.status(401).json({ error: "Missing session" });

    const workers = await UserModel.find({ tenantId: req.account.tenantId, accountType: "worker" })
        .sort({ name: 1 })
        .select("name specialty");

    return res.json({
        workers: workers.map((worker) => ({
            id: worker._id.toString(),
            name: worker.name,
            specialty: worker.specialty,
        })),
    });
});

export default workersRouter;
