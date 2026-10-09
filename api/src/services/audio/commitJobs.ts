import mongoose from "mongoose";
import { AudioImportModel } from "../../models/audio.js";
import { JobModel } from "../../models/job.js";
import { OutboxModel } from "../../models/outbox.js";
import { UserModel } from "../../models/user.js";
import type { PublicAccount } from "../../types/user.js";
import { specialtyLabel, tradeName } from "../../schemas/specialties.js";
import type { ExtractedJob } from "./extractJobs.js";

export async function commitJobs(input: {
    account: PublicAccount;
    audioImportId: string;
    transcript: string;
    jobs: ExtractedJob[];
}) {
    const session = await mongoose.startSession();
    try {
        let created = 0;
        await session.withTransaction(async () => {
            const managers = await UserModel.find({
                tenantId: input.account.tenantId,
                accountType: "manager",
            }).select("_id").session(session);

            for (const [sourceOrder, job] of input.jobs.entries()) {
                const worker = await UserModel.findOne({
                    tenantId: input.account.tenantId,
                    accountType: "worker",
                    specialty: job.specialty,
                }).sort({ createdAt: 1 }).session(session);

                const [saved] = await JobModel.create([{
                    tenantId: input.account.tenantId,
                    createdBy: input.account.id,
                    assignedTo: worker?._id ?? null,
                    audioImportId: input.audioImportId,
                    description: job.description,
                    location: job.location,
                    specialty: job.specialty,
                    requestedTimeText: job.requestedTimeText,
                    sourceText: job.sourceText,
                    sourceChunk: 0,
                    sourceOrder,
                    status: worker ? "assigned" : "draft",
                }], { session });

                await OutboxModel.create([{
                    tenantId: input.account.tenantId,
                    recipientId: worker?._id ?? input.account.id,
                    type: worker ? "JOB_ASSIGNED" : "IMPORT_COMPLETED",
                    jobId: saved?._id,
                    audioImportId: input.audioImportId,
                    message: worker
                        ? `New ${tradeName(job.specialty)} job: ${job.description}`
                        : `No ${specialtyLabel(job.specialty).toLowerCase()} yet for: ${job.description}`,
                    status: "pending",
                }], { session });

                if (managers.length > 0) {
                    await OutboxModel.create(managers.map((manager) => ({
                        tenantId: input.account.tenantId,
                        recipientId: manager._id,
                        type: "JOB_CREATED",
                        jobId: saved?._id,
                        audioImportId: input.audioImportId,
                        message: worker
                            ? `New ${tradeName(job.specialty)} job for ${worker.name}: ${job.description}`
                            : `New ${tradeName(job.specialty)} job needs assigning: ${job.description}`,
                        status: "pending",
                    })), { session, ordered: true });
                }
                created += 1;
            }

            await AudioImportModel.updateOne(
                { _id: input.audioImportId, tenantId: input.account.tenantId },
                { transcript: input.transcript, status: "completed", jobsCreated: created },
                { session },
            );
        });
        return created;
    } finally {
        await session.endSession();
    }
}
