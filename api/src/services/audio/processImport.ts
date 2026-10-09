import { AudioImportModel } from "../../models/audio.js";
import { OutboxModel } from "../../models/outbox.js";
import type { PublicAccount } from "../../types/user.js";
import { commitJobs } from "./commitJobs.js";
import { extractJobs } from "./extractJobs.js";

export async function openImport(input: { account: PublicAccount; storageKey: string }) {
    const audioImport = await AudioImportModel.create({
        tenantId: input.account.tenantId,
        createdBy: input.account.id,
        storageKey: input.storageKey,
        status: "transcribing",
    });
    return audioImport._id.toString();
}

export async function rememberTranscript(input: {
    audioImportId: string;
    tenantId: string;
    transcript: string;
}) {
    await AudioImportModel.updateOne(
        { _id: input.audioImportId, tenantId: input.tenantId },
        { transcript: input.transcript },
    );
}

export async function failImport(input: {
    account: PublicAccount;
    audioImportId: string;
    message: string;
}) {
    await AudioImportModel.updateOne(
        { _id: input.audioImportId, tenantId: input.account.tenantId },
        { status: "failed", lastError: input.message },
    );
    await OutboxModel.create({
        tenantId: input.account.tenantId,
        recipientId: input.account.id,
        type: "IMPORT_FAILED",
        audioImportId: input.audioImportId,
        message: "Audio processing stopped. Your saved drafts are still available.",
        status: "pending",
    });
}

export async function finishImport(input: {
    account: PublicAccount;
    audioImportId: string;
    transcript: string;
}) {
    try {
        if (!input.transcript) throw new Error("Transcription was empty");

        await AudioImportModel.updateOne(
            { _id: input.audioImportId, tenantId: input.account.tenantId },
            { transcript: input.transcript, status: "extracting" },
        );

        const jobs = await extractJobs(input.transcript);
        const jobsCreated = await commitJobs({
            account: input.account,
            audioImportId: input.audioImportId,
            transcript: input.transcript,
            jobs,
        });

        return { audioImportId: input.audioImportId, jobsCreated };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Import failed";
        await failImport({
            account: input.account,
            audioImportId: input.audioImportId,
            message,
        });
        throw error;
    }
}
