import { JobModel } from "../../models/job.js";
import { OutboxModel } from "../../models/outbox.js";
import { StreamCheckpointModel } from "../../models/streamCheckpoint.js";
import { UserModel } from "../../models/user.js";
import { tradeName } from "../../schemas/specialties.js";

const CHECKPOINT_ID = "job-status-watcher";

type ResumeToken = { _data: string };

type JobChange = {
    _id: ResumeToken;
    operationType: "update";
    updateDescription: { updatedFields: Record<string, unknown> };
    fullDocument?: {
        _id: { toString(): string };
        tenantId: { toString(): string };
        createdBy: { toString(): string };
        assignedTo?: { toString(): string } | null;
        lastChangedBy?: { toString(): string } | null;
        audioImportId: { toString(): string };
        description: string;
        specialty: string;
        status: string;
    } | null;
};

type OutboxDraft = {
    recipientId: string;
    type: "JOB_ASSIGNED" | "JOB_STARTED" | "JOB_COMPLETED";
    message: string;
};

function isDuplicateKey(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

async function workerName(tenantId: string, workerId: string | undefined) {
    if (!workerId) return "A worker";
    const worker = await UserModel.findOne({ _id: workerId, tenantId }).select("name");
    return worker?.name ?? "A worker";
}

async function managerIds(tenantId: string) {
    const managers = await UserModel.find({ tenantId, accountType: "manager" }).select("_id");
    return managers.map((manager) => manager._id.toString());
}

async function eventsFor(change: JobChange): Promise<OutboxDraft[]> {
    const job = change.fullDocument;
    if (!job) return [];

    const fields = change.updateDescription.updatedFields;
    const tenantId = job.tenantId.toString();
    const assigneeId = job.assignedTo?.toString();
    const creatorId = job.createdBy.toString();
    const managers = await managerIds(tenantId);
    const events: OutboxDraft[] = [];

    if ("assignedTo" in fields && assigneeId) {
        const name = await workerName(tenantId, assigneeId);
        events.push({
            recipientId: assigneeId,
            type: "JOB_ASSIGNED",
            message: `New ${tradeName(job.specialty)} job assigned to you: ${job.description}`,
        });
        for (const recipientId of managers) {
            events.push({ recipientId, type: "JOB_ASSIGNED", message: `${name} was assigned: ${job.description}` });
        }
    }

    if ("status" in fields && (job.status === "in_progress" || job.status === "completed")) {
        const name = await workerName(tenantId, assigneeId);
        const started = job.status === "in_progress";
        const message = `${name} ${started ? "started" : "completed"}: ${job.description}`;
        for (const recipientId of [creatorId, ...managers]) {
            events.push({ recipientId, type: started ? "JOB_STARTED" : "JOB_COMPLETED", message });
        }
    }

    // Nobody is notified about their own action, and nobody gets the same event twice.
    const actorId = job.lastChangedBy?.toString();
    const seen = new Set<string>();
    return events.filter((event) => {
        const key = `${event.type}:${event.recipientId}`;
        if (event.recipientId === actorId || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function handle(change: JobChange) {
    const job = change.fullDocument;
    if (job) {
        for (const event of await eventsFor(change)) {
            try {
                await OutboxModel.create({
                    tenantId: job.tenantId.toString(),
                    recipientId: event.recipientId,
                    type: event.type,
                    jobId: job._id.toString(),
                    audioImportId: job.audioImportId.toString(),
                    message: event.message,
                    dedupeKey: `${change._id._data}:${event.type}:${event.recipientId}`,
                    status: "pending",
                });
            } catch (error) {
                if (!isDuplicateKey(error)) throw error;
            }
        }
    }

    // Saved after the outbox insert: a crash in between replays this change,
    // and dedupeKey turns the replay into a no-op.
    await StreamCheckpointModel.updateOne(
        { _id: CHECKPOINT_ID },
        { resumeToken: change._id },
        { upsert: true },
    );
}

export function startJobStatusWatcher() {
    let stream: ReturnType<typeof JobModel.watch> | undefined;
    let stopped = false;
    let retry: NodeJS.Timeout | undefined;
    let queue = Promise.resolve();

    async function open() {
        if (stopped) return;
        const checkpoint = await StreamCheckpointModel.findById(CHECKPOINT_ID).lean();

        stream = JobModel.watch(
            [
                { $match: { operationType: "update" } },
                {
                    $match: {
                        $or: [
                            { "updateDescription.updatedFields.status": { $exists: true } },
                            { "updateDescription.updatedFields.assignedTo": { $exists: true } },
                        ],
                    },
                },
            ],
            {
                fullDocument: "updateLookup",
                ...(checkpoint ? { resumeAfter: checkpoint.resumeToken } : {}),
            },
        );

        stream.on("change", (change: JobChange) => {
            queue = queue.then(() => handle(change)).catch((error: unknown) => {
                console.error("Job status watcher failed to record a change:", error);
            });
        });

        stream.on("error", (error: Error & { code?: number }) => {
            console.error("Job status change stream error:", error.message);
            void stream?.close();
            // 286 means the saved resume token fell out of the oplog.
            const lost = error.code === 286 || error.code === 280;
            const reset = lost
                ? StreamCheckpointModel.deleteOne({ _id: CHECKPOINT_ID })
                : Promise.resolve();
            void reset.finally(() => {
                if (!stopped) retry = setTimeout(() => void open().catch(reportOpenError), 5_000);
            });
        });
    }

    function reportOpenError(error: unknown) {
        console.error("Could not open the job status change stream:", error);
        if (!stopped) retry = setTimeout(() => void open().catch(reportOpenError), 5_000);
    }

    void open().catch(reportOpenError);

    return async () => {
        stopped = true;
        if (retry) clearTimeout(retry);
        await stream?.close();
        await queue;
    };
}
