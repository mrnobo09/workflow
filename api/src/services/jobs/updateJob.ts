import { isValidObjectId } from "mongoose";
import { JobModel } from "../../models/job.js";
import { UserModel } from "../../models/user.js";
import type { JobStatus } from "../../middleware/scopeJobList.js";
import { specialtyLabel } from "../../schemas/specialties.js";
import type { PublicAccount } from "../../types/user.js";

export class JobUpdateError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
    }
}

const nextStatus: Partial<Record<JobStatus, JobStatus>> = {
    assigned: "in_progress",
    in_progress: "completed",
};

export async function changeJobStatus(account: PublicAccount, jobId: string, status: unknown) {
    if (!isValidObjectId(jobId)) throw new JobUpdateError(404, "Job not found");

    const job = await JobModel.findOne({ _id: jobId, tenantId: account.tenantId });
    if (!job) throw new JobUpdateError(404, "Job not found");

    if (account.accountType === "worker") {
        const mine = job.specialty === account.specialty && job.assignedTo?.toString() === account.id;
        if (!mine) throw new JobUpdateError(403, "This job is not assigned to you");
    } else if (account.accountType !== "manager") {
        throw new JobUpdateError(403, "Your role cannot change job status");
    }

    const current = job.status as JobStatus;
    if (status !== nextStatus[current]) {
        throw new JobUpdateError(409, `A ${current} job cannot move to ${String(status)}`);
    }

    // Matching the current status makes a double click or a race with another
    // tab fail cleanly instead of applying the same transition twice.
    const updated = await JobModel.findOneAndUpdate(
        { _id: job._id, tenantId: account.tenantId, status: current },
        { status, lastChangedBy: account.id },
        { new: true },
    );
    if (!updated) throw new JobUpdateError(409, "The job changed. Reload and try again.");
    return updated;
}

export async function assignJob(account: PublicAccount, jobId: string, workerId: unknown) {
    if (!isValidObjectId(jobId)) throw new JobUpdateError(404, "Job not found");
    if (typeof workerId !== "string" || !isValidObjectId(workerId)) {
        throw new JobUpdateError(400, "Choose a worker");
    }

    const job = await JobModel.findOne({ _id: jobId, tenantId: account.tenantId });
    if (!job) throw new JobUpdateError(404, "Job not found");
    if (job.status !== "draft" && job.status !== "assigned") {
        throw new JobUpdateError(409, "Only draft or assigned jobs can be reassigned");
    }

    const worker = await UserModel.findOne({
        _id: workerId,
        tenantId: account.tenantId,
        accountType: "worker",
        specialty: job.specialty,
    });
    if (!worker) {
        throw new JobUpdateError(400, `Choose a ${specialtyLabel(job.specialty).toLowerCase()} from your company`);
    }

    const updated = await JobModel.findOneAndUpdate(
        { _id: job._id, tenantId: account.tenantId, status: { $in: ["draft", "assigned"] } },
        { assignedTo: worker._id, status: "assigned", lastChangedBy: account.id },
        { new: true },
    );
    if (!updated) throw new JobUpdateError(409, "The job changed. Reload and try again.");
    return updated;
}
