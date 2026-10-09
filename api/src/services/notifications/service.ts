import { isValidObjectId } from "mongoose";
import { NotificationModel } from "../../models/notification.js";
import { OUTBOX_TYPES } from "../../models/outbox.js";
import { NOTIFICATION_GROUP, NOTIFICATION_STREAM, blockingRedis, redis } from "../../storage/redis.js";
import type { PublicAccount } from "../../types/user.js";

const CLAIM_IDLE_MS = 30_000;

export type NotificationView = {
    id: string;
    type: string;
    message: string;
    jobId?: string;
    createdAt: Date;
    readAt: Date | null;
};

export type NotificationClient = {
    send(event: string, data: unknown, id?: string): void;
};

type NotificationDoc = InstanceType<typeof NotificationModel>;
type StreamEntry = [id: string, fields: string[]];

const clients = new Map<string, Set<NotificationClient>>();

function clientKey(tenantId: string, userId: string) {
    return `${tenantId}:${userId}`;
}

export function toView(doc: NotificationDoc): NotificationView {
    return {
        id: doc._id.toString(),
        type: doc.type,
        message: doc.message,
        jobId: doc.jobId?.toString(),
        createdAt: doc.createdAt,
        readAt: doc.readAt ?? null,
    };
}

export function subscribe(account: PublicAccount, client: NotificationClient) {
    const key = clientKey(account.tenantId, account.id);
    const set = clients.get(key) ?? new Set<NotificationClient>();
    set.add(client);
    clients.set(key, set);

    return () => {
        set.delete(client);
        if (set.size === 0) clients.delete(key);
    };
}

function deliver(tenantId: string, recipientId: string, notification: NotificationView) {
    for (const client of clients.get(clientKey(tenantId, recipientId)) ?? []) {
        client.send("notification", notification, notification.id);
    }
}

export async function unreadNotifications(account: PublicAccount) {
    const docs = await NotificationModel.find({
        tenantId: account.tenantId,
        recipientId: account.id,
        readAt: null,
    }).sort({ _id: -1 }).limit(30);
    return docs.map(toView);
}

export async function notificationsAfter(account: PublicAccount, lastId: string) {
    if (!isValidObjectId(lastId)) return [];
    const docs = await NotificationModel.find({
        tenantId: account.tenantId,
        recipientId: account.id,
        _id: { $gt: lastId },
    }).sort({ _id: 1 }).limit(100);
    return docs.map(toView);
}

function fieldsToRecord(fields: string[]) {
    const record: Record<string, string> = {};
    for (let i = 0; i + 1 < fields.length; i += 2) {
        record[fields[i] as string] = fields[i + 1] as string;
    }
    return record;
}

type OutboxType = (typeof OUTBOX_TYPES)[number];

function isOutboxType(value: string | undefined): value is OutboxType {
    return value !== undefined && (OUTBOX_TYPES as readonly string[]).includes(value);
}

function isDuplicateKey(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

async function handleEntry(fields: string[]) {
    const event = fieldsToRecord(fields);
    const { eventId, tenantId, recipientId, type, jobId, message } = event;
    if (!eventId || !tenantId || !recipientId || !message || !isOutboxType(type)) return;
    if (!isValidObjectId(eventId) || !isValidObjectId(tenantId) || !isValidObjectId(recipientId)) return;

    let doc: NotificationDoc | null;
    try {
        doc = await NotificationModel.create({
            tenantId,
            recipientId,
            eventId,
            type,
            jobId: jobId && isValidObjectId(jobId) ? jobId : undefined,
            message,
        });
    } catch (error) {
        if (!isDuplicateKey(error)) throw error;
        doc = await NotificationModel.findOne({ eventId, tenantId, recipientId });
    }
    if (doc) deliver(tenantId, recipientId, toView(doc));
}

async function handleEntries(entries: StreamEntry[]) {
    for (const [id, fields] of entries) {
        try {
            await handleEntry(fields);
            await redis.xack(NOTIFICATION_STREAM, NOTIFICATION_GROUP, id);
        } catch (error) {
            // Left unacknowledged; the claim loop retries it after CLAIM_IDLE_MS.
            console.error("Notification delivery failed:", error);
        }
    }
}

async function ensureGroup() {
    try {
        await redis.xgroup("CREATE", NOTIFICATION_STREAM, NOTIFICATION_GROUP, "0", "MKSTREAM");
    } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("BUSYGROUP")) throw error;
    }
}

export function startNotificationService() {
    const reader = blockingRedis();
    const consumer = `api-${process.pid}`;
    let stopped = false;

    async function readLoop() {
        await ensureGroup();
        while (!stopped) {
            try {
                const result = await reader.xreadgroup(
                    "GROUP", NOTIFICATION_GROUP, consumer,
                    "COUNT", "20",
                    "BLOCK", "5000",
                    "STREAMS", NOTIFICATION_STREAM, ">",
                ) as Array<[stream: string, entries: StreamEntry[]]> | null;
                for (const [, entries] of result ?? []) await handleEntries(entries);
            } catch (error) {
                if (stopped) return;
                const message = error instanceof Error ? error.message : String(error);
                if (message.includes("NOGROUP")) await ensureGroup().catch(() => undefined);
                else console.error("Notification stream read failed:", message);
                await new Promise((resolve) => setTimeout(resolve, 2_000));
            }
        }
    }

    async function claimStale() {
        const result = await redis.xautoclaim(
            NOTIFICATION_STREAM, NOTIFICATION_GROUP, consumer,
            String(CLAIM_IDLE_MS), "0-0", "COUNT", "20",
        ) as [next: string, entries: StreamEntry[], deleted?: string[]];
        await handleEntries(result[1].filter((entry) => Array.isArray(entry[1])));
    }

    const loop = readLoop().catch((error: unknown) => {
        console.error("Notification service stopped:", error);
    });
    const claimTimer = setInterval(() => {
        void claimStale().catch((error: unknown) => {
            if (!stopped) console.error("Notification claim failed:", error);
        });
    }, CLAIM_IDLE_MS);

    return async () => {
        stopped = true;
        clearInterval(claimTimer);
        reader.disconnect();
        await loop;
    };
}
