import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { requireAccount } from "../middleware/requireAccount.js";
import { NotificationModel } from "../models/notification.js";

const notificationsRouter = Router();

notificationsRouter.post("/read-all", requireAccount, async (req, res) => {
    if (!req.account) return res.status(401).json({ error: "Missing session" });
    await NotificationModel.updateMany(
        { tenantId: req.account.tenantId, recipientId: req.account.id, readAt: null },
        { readAt: new Date() },
    );
    return res.status(204).send();
});

notificationsRouter.post("/:id/read", requireAccount, async (req, res) => {
    if (!req.account) return res.status(401).json({ error: "Missing session" });
    const id = String(req.params.id ?? "");
    if (!isValidObjectId(id)) return res.status(404).json({ error: "Notification not found" });

    const result = await NotificationModel.updateOne(
        { _id: id, tenantId: req.account.tenantId, recipientId: req.account.id },
        { readAt: new Date() },
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: "Notification not found" });
    return res.status(204).send();
});

export default notificationsRouter;
