import { Router } from "express";
import { requireAccount } from "../../middleware/requireAccount.js";
import { tokenExpiresAt } from "../../services/auth/tokens.js";
import {
    notificationsAfter,
    subscribe,
    unreadNotifications,
    type NotificationClient,
} from "../../services/notifications/service.js";

const HEARTBEAT_MS = 25_000;

const notificationStreamRouter = Router();

notificationStreamRouter.get("/", requireAccount, async (req, res) => {
    const account = req.account;
    if (!account) return res.status(401).json({ error: "Missing session" });

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const client: NotificationClient = {
        send(event, data, id) {
            if (res.writableEnded) return;
            if (id) res.write(`id: ${id}\n`);
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        },
    };

    // Subscribe before reading the backlog so nothing published in between is lost.
    // The browser drops a repeat because each event carries the notification id.
    const unsubscribe = subscribe(account, client);

    const headerId = req.get("Last-Event-ID");
    const queryId = typeof req.query.lastEventId === "string" ? req.query.lastEventId : undefined;
    const lastEventId = headerId || queryId;

    try {
        if (lastEventId) {
            for (const notification of await notificationsAfter(account, lastEventId)) {
                client.send("notification", notification, notification.id);
            }
        } else {
            client.send("backlog", await unreadNotifications(account));
        }
    } catch {
        client.send("error", { message: "Could not load notifications" });
    }

    res.write(`retry: 5000\n\n`);
    const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

    // The session was checked once at connect, so end the stream when the access
    // token expires. The browser refreshes the cookie and reconnects.
    const expiresAt = tokenExpiresAt(req.cookies?.access_token ?? "");
    const expiry = expiresAt
        ? setTimeout(() => {
            client.send("session-expired", {});
            res.end();
        }, Math.max(0, expiresAt - Date.now()))
        : undefined;

    req.on("close", () => {
        clearInterval(heartbeat);
        if (expiry) clearTimeout(expiry);
        unsubscribe();
    });
});

export default notificationStreamRouter;
