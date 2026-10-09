import { OutboxModel } from "../../models/outbox.js";
import { NOTIFICATION_STREAM, redis } from "../../storage/redis.js";

const SWEEP_MS = 15_000;
const MAX_BACKOFF_MS = 5 * 60_000;

type OutboxRow = {
    _id: { toString(): string };
    tenantId: { toString(): string };
    recipientId: { toString(): string };
    type: string;
    jobId?: { toString(): string } | null;
    message: string;
    attempts?: number | null;
    status?: string | null;
};

const inFlight = new Set<string>();

async function relay(row: OutboxRow) {
    const id = row._id.toString();
    if (row.status === "published" || inFlight.has(id)) return;
    inFlight.add(id);

    try {
        await redis.xadd(
            NOTIFICATION_STREAM,
            "MAXLEN", "~", "10000",
            "*",
            "eventId", id,
            "tenantId", row.tenantId.toString(),
            "recipientId", row.recipientId.toString(),
            "type", row.type,
            "jobId", row.jobId?.toString() ?? "",
            "message", row.message,
        );
        await OutboxModel.updateOne({ _id: row._id, status: "pending" }, { status: "published" });
    } catch (error) {
        // At-least-once: if Redis accepted the entry but this update failed, the row
        // is relayed again later and the notification service drops the duplicate.
        const attempts = (row.attempts ?? 0) + 1;
        const delay = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** attempts);
        await OutboxModel.updateOne(
            { _id: row._id, status: "pending" },
            {
                $inc: { attempts: 1 },
                nextAttemptAt: new Date(Date.now() + delay),
                lastError: error instanceof Error ? error.message : "Relay failed",
            },
        ).catch(() => undefined);
    } finally {
        inFlight.delete(id);
    }
}

async function sweep() {
    const due = await OutboxModel.find({ status: "pending", nextAttemptAt: { $lte: new Date() } })
        .sort({ nextAttemptAt: 1, createdAt: 1 })
        .limit(50)
        .lean();
    for (const row of due) await relay(row);
}

export function startOutboxRelay() {
    let stopped = false;
    let stream: ReturnType<typeof OutboxModel.watch> | undefined;
    let retry: NodeJS.Timeout | undefined;

    function open() {
        if (stopped) return;
        stream = OutboxModel.watch([{ $match: { operationType: "insert" } }]);
        stream.on("change", (change: { fullDocument?: OutboxRow }) => {
            if (change.fullDocument) void relay(change.fullDocument);
        });
        stream.on("error", (error: Error) => {
            console.error("Outbox change stream error:", error.message);
            void stream?.close();
            if (!stopped) retry = setTimeout(open, 5_000);
        });
    }

    // The stream opens before the first sweep, so a row inserted during startup is
    // seen by at least one of them. The sweep also picks up rows written while the
    // API was down and rows whose relay failed.
    open();
    const run = () => sweep().catch((error: unknown) => {
        console.error("Outbox sweep failed:", error);
    });
    void run();
    const timer = setInterval(() => void run(), SWEEP_MS);

    return async () => {
        stopped = true;
        clearInterval(timer);
        if (retry) clearTimeout(retry);
        await stream?.close();
    };
}
