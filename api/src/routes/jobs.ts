import { Router, type Request, type Response } from "express";
import { requireAccount } from "../middleware/requireAccount.js";
import { requireRole } from "../middleware/requireRole.js";
import { scopeJobList } from "../middleware/scopeJobList.js";
import { JobModel } from "../models/job.js";
import { UserModel } from "../models/user.js";
import { JobUpdateError, assignJob, changeJobStatus } from "../services/jobs/updateJob.js";
import type { PublicAccount } from "../types/user.js";

type JobDocument = InstanceType<typeof JobModel>;

const jobsRouter = Router();

async function namesById(tenantId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map<string, string>();
    const users = await UserModel.find({ _id: { $in: unique }, tenantId }).select("name");
    return new Map(users.map((user) => [user._id.toString(), user.name]));
}

async function present(account: PublicAccount, jobs: JobDocument[]) {
    const ids = jobs.flatMap((job) => [
        job.createdBy.toString(),
        ...(job.assignedTo ? [job.assignedTo.toString()] : []),
    ]);
    const names = await namesById(account.tenantId, ids);

    return jobs.map((job) => {
        const assigneeId = job.assignedTo?.toString();
        const creatorId = job.createdBy.toString();
        return {
            id: job._id.toString(),
            description: job.description,
            location: job.location,
            specialty: job.specialty,
            status: job.status,
            requestedTimeText: job.requestedTimeText,
            sourceText: account.accountType === "worker" ? undefined : job.sourceText,
            assignee: assigneeId ? { id: assigneeId, name: names.get(assigneeId) ?? "Unknown" } : null,
            createdBy: { id: creatorId, name: names.get(creatorId) ?? "Unknown" },
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        };
    });
}

function sendUpdateError(res: Response, error: unknown) {
    if (error instanceof JobUpdateError) {
        return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: "Could not update the job" });
}

function jobId(req: Request) {
    return String(req.params.id ?? "");
}

jobsRouter.get("/", requireAccount, scopeJobList, async (req, res) => {
    if (!req.account || !req.jobFilter) {
        return res.status(401).json({ error: "Missing session" });
    }

    const { tenantId, createdBy, assignedTo, specialty, status } = req.jobFilter;
    const filter: Record<string, string> = { tenantId };
    if (createdBy) filter.createdBy = createdBy;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (specialty) filter.specialty = specialty;
    if (status) filter.status = status;

    const jobs = await JobModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(100);

    return res.json({ jobs: await present(req.account, jobs) });
});

jobsRouter.patch("/:id/status", requireAccount, requireRole("worker", "manager"), async (req, res) => {
    if (!req.account) return res.status(401).json({ error: "Missing session" });
    try {
        const job = await changeJobStatus(req.account, jobId(req), req.body?.status);
        const [visible] = await present(req.account, [job]);
        return res.json({ job: visible });
    } catch (error) {
        return sendUpdateError(res, error);
    }
});

jobsRouter.patch("/:id/assignee", requireAccount, requireRole("manager"), async (req, res) => {
    if (!req.account) return res.status(401).json({ error: "Missing session" });
    try {
        const job = await assignJob(req.account, jobId(req), req.body?.workerId);
        const [visible] = await present(req.account, [job]);
        return res.json({ job: visible });
    } catch (error) {
        return sendUpdateError(res, error);
    }
});

export default jobsRouter;
